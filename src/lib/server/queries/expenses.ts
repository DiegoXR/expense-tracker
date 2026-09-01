import { and, asc, desc, eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { categories, expenseSplits, expenses } from '$lib/server/db/schema';
import { buildSplits, type SplitInput } from '$lib/domain/split';
import type { ExpenseView } from '$lib/domain/types';

/**
 * Every expense in a group, with its category and splits.
 *
 * Two statements rather than one joined query: a join against `expense_splits`
 * multiplies expense rows by their participants, and stitching that back apart
 * costs more than a second concurrent round trip. `Promise.all`, never
 * `db.batch` — see CLAUDE.md §6 on batched reads shifting columns.
 */
export async function listExpenses(db: Database, groupId: string): Promise<ExpenseView[]> {
	const [expenseRows, splitRows] = await Promise.all([
		db
			.select({
				id: expenses.id,
				description: expenses.description,
				notes: expenses.notes,
				totalMinor: expenses.totalMinor,
				expenseDate: expenses.expenseDate,
				payerMemberId: expenses.payerMemberId,
				categoryId: categories.id,
				categoryName: categories.name,
				categoryIcon: categories.icon,
				categoryColor: categories.color
			})
			.from(expenses)
			.leftJoin(categories, eq(categories.id, expenses.categoryId))
			.where(eq(expenses.groupId, groupId))
			.orderBy(desc(expenses.expenseDate), asc(expenses.id)),
		db
			.select({
				expenseId: expenseSplits.expenseId,
				memberId: expenseSplits.memberId,
				sharePct: expenseSplits.sharePct,
				shareMinor: expenseSplits.shareMinor
			})
			.from(expenseSplits)
			.innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
			.where(eq(expenses.groupId, groupId))
	]);

	const splitsByExpense: Record<string, ExpenseView['splits']> = {};
	for (const split of splitRows) {
		(splitsByExpense[split.expenseId] ??= []).push({
			memberId: split.memberId,
			sharePct: split.sharePct,
			shareMinor: split.shareMinor
		});
	}

	return expenseRows.map((row) => ({
		id: row.id,
		description: row.description,
		notes: row.notes,
		totalMinor: row.totalMinor,
		expenseDate: row.expenseDate,
		payerMemberId: row.payerMemberId,
		category: row.categoryId
			? {
					id: row.categoryId,
					name: row.categoryName ?? '',
					icon: row.categoryIcon ?? '',
					color: row.categoryColor ?? ''
				}
			: null,
		splits: splitsByExpense[row.id] ?? []
	}));
}

export type NewExpenseInput = {
	groupId: string;
	payerMemberId: string;
	categoryId: string | null;
	description: string;
	notes: string | null;
	totalMinor: number;
	expenseDate: string;
	/** Percentages only. The amounts are derived here, never taken from the client. */
	shares: SplitInput[];
};

/**
 * Writes an expense and its splits atomically.
 *
 * `db.batch` because D1 rejects Drizzle's transactions, and an expense without
 * its splits would be a hole in the ledger: the payer would appear to have lent
 * the entire amount to nobody.
 */
export async function createExpense(db: Database, input: NewExpenseInput): Promise<string> {
	const expenseId = crypto.randomUUID();
	const splits = buildSplits(input.totalMinor, input.shares);

	await db.batch([
		db.insert(expenses).values({
			id: expenseId,
			groupId: input.groupId,
			payerMemberId: input.payerMemberId,
			categoryId: input.categoryId,
			description: input.description,
			notes: input.notes,
			totalMinor: input.totalMinor,
			expenseDate: input.expenseDate
		}),
		db.insert(expenseSplits).values(
			splits.map((split) => ({
				expenseId,
				memberId: split.memberId,
				sharePct: split.sharePct,
				shareMinor: split.shareMinor
			}))
		)
	]);

	return expenseId;
}

/** Replaces an expense and its splits in one shot. */
export async function updateExpense(
	db: Database,
	expenseId: string,
	input: Omit<NewExpenseInput, 'groupId'>
): Promise<void> {
	const splits = buildSplits(input.totalMinor, input.shares);

	await db.batch([
		db
			.update(expenses)
			.set({
				payerMemberId: input.payerMemberId,
				categoryId: input.categoryId,
				description: input.description,
				notes: input.notes,
				totalMinor: input.totalMinor,
				expenseDate: input.expenseDate
			})
			.where(eq(expenses.id, expenseId)),
		db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId)),
		db.insert(expenseSplits).values(
			splits.map((split) => ({
				expenseId,
				memberId: split.memberId,
				sharePct: split.sharePct,
				shareMinor: split.shareMinor
			}))
		)
	]);
}

/** Splits cascade away with the expense. */
export async function deleteExpense(
	db: Database,
	groupId: string,
	expenseId: string
): Promise<void> {
	await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)));
}

/** Ids of expenses in this group — used to check an id belongs here. */
export async function expenseBelongsToGroup(
	db: Database,
	groupId: string,
	expenseId: string
): Promise<boolean> {
	const rows = await db
		.select({ id: expenses.id })
		.from(expenses)
		.where(and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId)));
	return rows.length > 0;
}
