/**
 * Every user-facing sentence the ledger produces, in one place.
 *
 * Always third person, never "you". The app has no per-user session (access is
 * gated at the edge, by Cloudflare Access), so there is nobody for "you" to
 * refer to — every reader sees the same ledger and every member is named.
 */

import type { MemberBalance } from './balance';
import { formatMinor } from './money';
import type { CurrencyMeta, ExpenseView, MemberSummary } from './types';

/** Joins clauses the way English does: "a", "a and b", "a, b and c". */
function joinClauses(clauses: string[]): string {
	if (clauses.length === 0) return '';
	if (clauses.length === 1) return clauses[0];
	return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}

function nameOf(member: MemberSummary | undefined): string {
	return member?.person.name ?? 'Someone';
}

export type ExpenseDescription = {
	/** "Alex paid $100.00 for Dinner." */
	title: string;
	/** "Alex lent $40.00 and Sam owes $40.00." Empty when nobody owes anything. */
	detail: string;
};

/**
 * Describes one expense: who paid, who lent, and who owes.
 * Derived from the stored amounts, so the sentence always matches the balances.
 */
export function describeExpense(
	expense: ExpenseView,
	members: MemberSummary[],
	currency: CurrencyMeta
): ExpenseDescription {
	const byId = new Map(members.map((member) => [member.id, member]));
	const payer = byId.get(expense.payerMemberId);

	const title = `${nameOf(payer)} paid ${formatMinor(expense.totalMinor, currency)} for ${expense.description}.`;

	const payerShare =
		expense.splits.find((split) => split.memberId === expense.payerMemberId)?.shareMinor ?? 0;
	const lentMinor = expense.totalMinor - payerShare;

	if (lentMinor <= 0) {
		return { title, detail: `${nameOf(payer)} covered this one alone.` };
	}

	const clauses = [`${nameOf(payer)} lent ${formatMinor(lentMinor, currency)}`];

	for (const split of expense.splits) {
		if (split.memberId === expense.payerMemberId || split.shareMinor <= 0) continue;
		const debtor = byId.get(split.memberId);
		clauses.push(`${nameOf(debtor)} owes ${formatMinor(split.shareMinor, currency)}`);
	}

	return { title, detail: `${joinClauses(clauses)}.` };
}

type BalanceStatus = 'owed' | 'owes' | 'settled';

function balanceStatus(balanceMinor: number): BalanceStatus {
	if (balanceMinor > 0) return 'owed';
	if (balanceMinor < 0) return 'owes';
	return 'settled';
}

/**
 * The caption under a balance figure. Deliberately omits the name, because it
 * is always rendered next to one — repeating it reads like a stutter.
 */
export function describeBalance(balance: MemberBalance): string {
	switch (balanceStatus(balance.balanceMinor)) {
		case 'owed':
			return 'Is owed';
		case 'owes':
			return 'Owes';
		case 'settled':
			return 'Settled up';
	}
}
