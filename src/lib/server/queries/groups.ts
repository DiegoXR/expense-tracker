import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import {
	currencies,
	expenseSplits,
	expenses,
	groupMembers,
	groups,
	people,
	settlements
} from '$lib/server/db/schema';
import type { GroupSummary, GroupView, MemberSummary } from '$lib/domain/types';

/** A group as the overview lists it: identity, currency, and what it has cost. */
export type GroupWithTotal = {
	group: GroupSummary;
	totalMinor: number;
};

const currencyColumns = {
	code: currencies.code,
	symbol: currencies.symbol,
	decimals: currencies.decimals,
	locale: currencies.locale,
	allowDecimals: currencies.allowDecimals
};

/**
 * Every active group with its total spend, in one round trip.
 *
 * The aggregate happens in SQL rather than by fetching expenses and summing
 * them here: D1 bills on rows read, and the overview only needs one number per
 * group however many expenses it holds.
 */
export async function listGroupsWithTotals(db: Database): Promise<GroupWithTotal[]> {
	const rows = await db
		.select({
			id: groups.id,
			name: groups.name,
			description: groups.description,
			...currencyColumns,
			totalMinor: sql<number>`coalesce(sum(${expenses.totalMinor}), 0)`
		})
		.from(groups)
		.innerJoin(currencies, eq(currencies.code, groups.currencyCode))
		.leftJoin(expenses, eq(expenses.groupId, groups.id))
		.where(isNull(groups.archivedAt))
		.groupBy(groups.id)
		.orderBy(asc(groups.name));

	return rows.map((row) => ({
		group: {
			id: row.id,
			name: row.name,
			description: row.description,
			currency: {
				code: row.code,
				symbol: row.symbol,
				decimals: row.decimals,
				locale: row.locale,
				allowDecimals: row.allowDecimals
			}
		},
		totalMinor: Number(row.totalMinor)
	}));
}

/** One group with its active roster, or null when the id does not exist. */
export async function getGroup(db: Database, groupId: string): Promise<GroupView | null> {
	// Deliberately `Promise.all`, not `db.batch`.
	//
	// D1 returns batched rows as objects keyed by column name. This join emits two
	// columns literally named `id` (`group_members.id` and `people.id`), the
	// duplicate key collapses, and every field after it shifts by one — silently,
	// with no error: `name` came back null and `personId` held the name. `batch`
	// is the atomicity primitive for writes; reads go through Promise.all, which
	// issues both statements concurrently anyway, so this costs no extra latency.
	const [groupRows, memberRows] = await Promise.all([
		db
			.select({
				id: groups.id,
				name: groups.name,
				description: groups.description,
				...currencyColumns
			})
			.from(groups)
			.innerJoin(currencies, eq(currencies.code, groups.currencyCode))
			.where(and(eq(groups.id, groupId), isNull(groups.archivedAt))),
		db
			.select({
				id: groupMembers.id,
				groupId: groupMembers.groupId,
				personId: people.id,
				name: people.name,
				avatarColor: people.avatarColor,
				isSelf: people.isSelf
			})
			.from(groupMembers)
			.innerJoin(people, eq(people.id, groupMembers.personId))
			.where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.removedAt)))
			.orderBy(asc(people.name))
	]);

	const row = groupRows[0];
	if (!row) return null;

	const members: MemberSummary[] = memberRows.map((member) => ({
		id: member.id,
		groupId: member.groupId,
		person: {
			id: member.personId,
			name: member.name,
			avatarColor: member.avatarColor,
			isSelf: member.isSelf
		}
	}));

	return {
		id: row.id,
		name: row.name,
		description: row.description,
		currency: {
			code: row.code,
			symbol: row.symbol,
			decimals: row.decimals,
			locale: row.locale,
			allowDecimals: row.allowDecimals
		},
		members
	};
}

export async function createGroup(
	db: Database,
	input: { name: string; description: string | null; currencyCode: string; personIds: string[] }
): Promise<string> {
	const groupId = crypto.randomUUID();

	await db.insert(groups).values({
		id: groupId,
		name: input.name,
		description: input.description,
		currencyCode: input.currencyCode
	});

	if (input.personIds.length > 0) {
		await db
			.insert(groupMembers)
			.values(input.personIds.map((personId) => ({ groupId, personId })));
	}

	return groupId;
}

export async function updateGroup(
	db: Database,
	groupId: string,
	input: { name: string; description: string | null }
): Promise<void> {
	await db
		.update(groups)
		.set({ name: input.name, description: input.description })
		.where(eq(groups.id, groupId));
}

export async function archiveGroup(db: Database, groupId: string): Promise<void> {
	await db.update(groups).set({ archivedAt: new Date() }).where(eq(groups.id, groupId));
}

/**
 * Hard-deletes a group and everything inside it, in dependency order.
 *
 * A bare `DELETE FROM groups` cannot work: the cascade to `group_members` runs
 * into the RESTRICT from `expenses`, and SQLite aborts the whole statement. That
 * restriction is correct — it stops history losing its subject — so the order is
 * explicit here instead. `db.batch` because D1 rejects Drizzle's transactions.
 */
export async function deleteGroup(db: Database, groupId: string): Promise<void> {
	const expenseIds = db
		.select({ id: expenses.id })
		.from(expenses)
		.where(eq(expenses.groupId, groupId));

	await db.batch([
		db.delete(expenseSplits).where(inArray(expenseSplits.expenseId, expenseIds)),
		db.delete(expenses).where(eq(expenses.groupId, groupId)),
		db.delete(settlements).where(eq(settlements.groupId, groupId)),
		db.delete(groupMembers).where(eq(groupMembers.groupId, groupId)),
		db.delete(groups).where(eq(groups.id, groupId))
	]);
}
