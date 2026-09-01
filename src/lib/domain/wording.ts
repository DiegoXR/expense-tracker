/**
 * Every user-facing sentence the ledger produces, in one place. Second person for
 * whoever is marked `isSelf`, third person for everyone else.
 */

import type { MemberBalance } from './balance';
import { formatMinor } from './money';
import type { Transfer } from './settle';
import type { CurrencyMeta, ExpenseView, MemberSummary } from './types';

/** Joins clauses the way English does: "a", "a and b", "a, b and c". */
function joinClauses(clauses: string[]): string {
	if (clauses.length === 0) return '';
	if (clauses.length === 1) return clauses[0];
	return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}

function capitalizeFirst(sentence: string): string {
	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** "you" for the viewer, otherwise the person's name. */
function nameOf(member: MemberSummary | undefined): string {
	if (!member) return 'someone';
	return member.person.isSelf ? 'you' : member.person.name;
}

export type ExpenseDescription = {
	/** "Sam paid $100.00 for Dinner." */
	title: string;
	/** "You lent $40.00 and Sam owes $40.00." Empty when nobody owes anything. */
	detail: string;
};

/**
 * Describes one expense from the viewer's point of view.
 * Derived from the stored amounts, so the sentence always matches the balances.
 */
export function describeExpense(
	expense: ExpenseView,
	members: MemberSummary[],
	currency: CurrencyMeta
): ExpenseDescription {
	const byId = new Map(members.map((member) => [member.id, member]));
	const payer = byId.get(expense.payerMemberId);
	const payerIsViewer = payer?.person.isSelf ?? false;

	const title = capitalizeFirst(
		`${nameOf(payer)} paid ${formatMinor(expense.totalMinor, currency)} for ${expense.description}.`
	);

	const payerShare =
		expense.splits.find((split) => split.memberId === expense.payerMemberId)?.shareMinor ?? 0;
	const lentMinor = expense.totalMinor - payerShare;

	if (lentMinor <= 0) {
		return {
			title,
			detail: payerIsViewer
				? 'You covered this one yourself.'
				: `${payer?.person.name ?? 'They'} covered this one alone.`
		};
	}

	const clauses = [`${nameOf(payer)} lent ${formatMinor(lentMinor, currency)}`];

	for (const split of expense.splits) {
		if (split.memberId === expense.payerMemberId || split.shareMinor <= 0) continue;
		const debtor = byId.get(split.memberId);
		const verb = debtor?.person.isSelf ? 'owe' : 'owes';
		clauses.push(`${nameOf(debtor)} ${verb} ${formatMinor(split.shareMinor, currency)}`);
	}

	return { title, detail: `${capitalizeFirst(joinClauses(clauses))}.` };
}

export type BalanceStatus = 'owed' | 'owes' | 'settled';

export function balanceStatus(balanceMinor: number): BalanceStatus {
	if (balanceMinor > 0) return 'owed';
	if (balanceMinor < 0) return 'owes';
	return 'settled';
}

/** The caption under a balance figure: "You are owed", "Sam owes", "Settled up". */
export function describeBalance(balance: MemberBalance): string {
	const isSelf = balance.person.isSelf;
	switch (balanceStatus(balance.balanceMinor)) {
		case 'owed':
			return isSelf ? 'You are owed' : `${balance.person.name} is owed`;
		case 'owes':
			return isSelf ? 'You owe' : `${balance.person.name} owes`;
		case 'settled':
			return 'Settled up';
	}
}

/** One suggested transfer: "Sam pays you $40.00". */
export function describeTransfer(
	transfer: Transfer,
	members: MemberSummary[],
	currency: CurrencyMeta
): string {
	const byId = new Map(members.map((member) => [member.id, member]));
	const from = byId.get(transfer.fromMemberId);
	const to = byId.get(transfer.toMemberId);
	const verb = from?.person.isSelf ? 'pay' : 'pays';
	return capitalizeFirst(
		`${nameOf(from)} ${verb} ${nameOf(to)} ${formatMinor(transfer.amountMinor, currency)}`
	);
}
