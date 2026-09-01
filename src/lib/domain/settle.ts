/**
 * Turning balances into "who pays whom". Suggestions are read-only and prefill the
 * settlement form; nothing is recorded until the user confirms.
 */

import type { MemberBalance } from './balance';

export type Transfer = {
	fromMemberId: string;
	toMemberId: string;
	amountMinor: number;
};

/**
 * Greedy creditor/debtor matching, at most n−1 transfers, ties broken by member id.
 * Not guaranteed minimal — that problem is NP-hard — but it is what Splitwise ships.
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
	const debtors = balances
		.filter((balance) => balance.balanceMinor < 0)
		.map((balance) => ({ id: balance.memberId, owes: -balance.balanceMinor }))
		.sort((a, b) => b.owes - a.owes || (a.id < b.id ? -1 : 1));

	const creditors = balances
		.filter((balance) => balance.balanceMinor > 0)
		.map((balance) => ({ id: balance.memberId, due: balance.balanceMinor }))
		.sort((a, b) => b.due - a.due || (a.id < b.id ? -1 : 1));

	const transfers: Transfer[] = [];
	let d = 0;
	let c = 0;

	while (d < debtors.length && c < creditors.length) {
		const amountMinor = Math.min(debtors[d].owes, creditors[c].due);
		transfers.push({
			fromMemberId: debtors[d].id,
			toMemberId: creditors[c].id,
			amountMinor
		});

		debtors[d].owes -= amountMinor;
		creditors[c].due -= amountMinor;
		if (debtors[d].owes === 0) d++;
		if (creditors[c].due === 0) c++;
	}

	return transfers;
}
