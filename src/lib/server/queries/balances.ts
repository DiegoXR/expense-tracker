import { sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { expenseSplits, expenses, settlements } from '$lib/server/db/schema';
import { mergeBalances, type BalanceDelta, type MemberBalance } from '$lib/domain/balance';
import type { MemberSummary } from '$lib/domain/types';

/**
 * Every member's balance, aggregated in SQL in one round trip.
 *
 * The query is a literal transcription of the formula in CLAUDE.md §2 — four
 * terms, four SELECTs. It runs in SQL rather than TypeScript not for CPU (the
 * dataset is tiny) but because D1 bills on rows read and every statement is a
 * round trip: fetching every split on every page load scales linearly forever,
 * while this returns one row per member however large the ledger grows.
 *
 * `computeBalanceDeltas` in domain/ is the reference implementation this is
 * checked against, and `mergeBalances` puts members with no activity back on the
 * roster at zero.
 */
export async function getGroupBalances(
	db: Database,
	groupId: string,
	members: MemberSummary[]
): Promise<MemberBalance[]> {
	const rows = await db.all<{ member_id: string; balance_minor: number }>(sql`
		SELECT member_id, SUM(delta_minor) AS balance_minor
		FROM (
				SELECT ${expenses.payerMemberId} AS member_id, ${expenses.totalMinor} AS delta_minor
					FROM ${expenses} WHERE ${expenses.groupId} = ${groupId}
			UNION ALL
				SELECT ${expenseSplits.memberId}, -${expenseSplits.shareMinor}
					FROM ${expenseSplits}
					JOIN ${expenses} ON ${expenses.id} = ${expenseSplits.expenseId}
				 WHERE ${expenses.groupId} = ${groupId}
			UNION ALL
				SELECT ${settlements.fromMemberId}, ${settlements.amountMinor}
					FROM ${settlements} WHERE ${settlements.groupId} = ${groupId}
			UNION ALL
				SELECT ${settlements.toMemberId}, -${settlements.amountMinor}
					FROM ${settlements} WHERE ${settlements.groupId} = ${groupId}
		)
		GROUP BY member_id
	`);

	const deltas: BalanceDelta[] = rows
		// A member removed from the group keeps their history, so the aggregate can
		// name someone no longer on the roster. `mergeBalances` would throw on them.
		.filter((row) => members.some((member) => member.id === row.member_id))
		.map((row) => ({ memberId: row.member_id, balanceMinor: Number(row.balance_minor) }));

	return mergeBalances(members, deltas);
}
