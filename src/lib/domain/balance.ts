/**
 * Who owes whom.
 *
 *     balance = Σ paid − Σ own share + Σ settlements sent − Σ settlements received
 *
 * Positive means the group owes them; negative means they owe it. It is not income —
 * nobody earns anything by paying for dinner. Balances in a group always sum to zero.
 */

import type { ExpenseView, MemberSummary, SettlementView } from './types';

export type MemberBalance = {
	/** Group membership id. */
	memberId: string;
	person: MemberSummary['person'];
	/** Positive: they are owed. Negative: they owe. In minor units. */
	balanceMinor: number;
};

/** One member's net delta, as returned by the aggregate query. */
export type BalanceDelta = {
	memberId: string;
	balanceMinor: number;
};

/**
 * The balance formula, transcribed directly. From Phase 3 the same aggregation runs
 * in SQL; this stays as the reference the query is tested against.
 */
export function computeBalanceDeltas(
	expenses: ExpenseView[],
	settlements: SettlementView[]
): BalanceDelta[] {
	const totals = new Map<string, number>();
	const add = (memberId: string, amount: number) =>
		totals.set(memberId, (totals.get(memberId) ?? 0) + amount);

	for (const expense of expenses) {
		add(expense.payerMemberId, expense.totalMinor);
		for (const split of expense.splits) add(split.memberId, -split.shareMinor);
	}

	for (const settlement of settlements) {
		add(settlement.fromMemberId, settlement.amountMinor);
		add(settlement.toMemberId, -settlement.amountMinor);
	}

	return [...totals].map(([memberId, balanceMinor]) => ({ memberId, balanceMinor }));
}

/**
 * Applies query deltas onto the full member list.
 * Members with no activity still appear at zero, which is why we seed from the roster.
 */
export function mergeBalances(members: MemberSummary[], deltas: BalanceDelta[]): MemberBalance[] {
	const byMemberId = new Map(members.map((member) => [member.id, 0]));

	for (const delta of deltas) {
		const current = byMemberId.get(delta.memberId);
		// A delta for an unknown member means the roster and the ledger disagree;
		// dropping it silently would hide the bug and unbalance the group.
		if (current === undefined) {
			throw new Error(
				`Balance delta references member ${delta.memberId}, who is not in the group.`
			);
		}
		byMemberId.set(delta.memberId, current + delta.balanceMinor);
	}

	return members.map((member) => ({
		memberId: member.id,
		person: member.person,
		balanceMinor: byMemberId.get(member.id) ?? 0
	}));
}

/**
 * Balances must sum to zero; anything else is data corruption and otherwise silent.
 * Called from load functions in dev only — a bug detector, not validation.
 */
export function assertBalancesSumToZero(balances: MemberBalance[]): void {
	const total = balances.reduce((sum, balance) => sum + balance.balanceMinor, 0);
	if (total !== 0) {
		throw new Error(
			`Balance invariant violated: balances sum to ${total} minor units instead of 0.`
		);
	}
}
