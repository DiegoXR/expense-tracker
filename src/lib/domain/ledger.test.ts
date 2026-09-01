import { describe, expect, it } from 'vitest';
import {
	assertBalancesSumToZero,
	computeBalanceDeltas,
	computeMemberLedger,
	mergeBalances,
	type MemberBalance
} from './balance';
import { simplifyDebts } from './settle';
import { buildSplits } from './split';
import { describeBalance, describeExpense, describeTransfer } from './wording';
import type { CurrencyMeta, ExpenseView, MemberSummary, SettlementView } from './types';

const USD: CurrencyMeta = {
	code: 'USD',
	symbol: '$',
	decimals: 2,
	locale: 'en-US',
	allowDecimals: true
};

const alex: MemberSummary = {
	id: 'gm-alex',
	groupId: 'g',
	person: { id: 'p-alex', name: 'Alex', avatarColor: 'indigo', isSelf: true }
};
const sam: MemberSummary = {
	id: 'gm-sam',
	groupId: 'g',
	person: { id: 'p-sam', name: 'Sam', avatarColor: 'rose', isSelf: false }
};
const members = [alex, sam];

/** The worked example from the docs: Alex pays 100.00, split 60/40. */
const dinner: ExpenseView = {
	id: 'e1',
	description: 'Dinner',
	notes: null,
	totalMinor: 10_000,
	expenseDate: '2026-08-28',
	payerMemberId: alex.id,
	category: null,
	splits: buildSplits(10_000, [
		{ memberId: alex.id, sharePct: 60 },
		{ memberId: sam.id, sharePct: 40 }
	])
};

describe('buildSplits', () => {
	it('produces the same result regardless of input order', () => {
		const forward = buildSplits(333, [
			{ memberId: 'a', sharePct: 50 },
			{ memberId: 'b', sharePct: 50 }
		]);
		const reversed = buildSplits(333, [
			{ memberId: 'b', sharePct: 50 },
			{ memberId: 'a', sharePct: 50 }
		]);
		expect(reversed).toEqual(forward);
		// The odd cent lands on the same member either way.
		expect(forward.find((s) => s.memberId === 'a')?.shareMinor).toBe(167);
	});

	it('always sums to the expense total', () => {
		const splits = buildSplits(10_000, [
			{ memberId: 'a', sharePct: 34 },
			{ memberId: 'b', sharePct: 33 },
			{ memberId: 'c', sharePct: 33 }
		]);
		expect(splits.reduce((sum, s) => sum + s.shareMinor, 0)).toBe(10_000);
	});
});

describe('balances', () => {
	it('matches the worked example: payer +$40.00, other -$40.00', () => {
		const balances = mergeBalances(members, computeBalanceDeltas([dinner], []));
		expect(balances).toEqual([
			{ memberId: alex.id, person: alex.person, balanceMinor: 4000 },
			{ memberId: sam.id, person: sam.person, balanceMinor: -4000 }
		]);
	});

	it('returns to zero once the debt is settled', () => {
		const balances = mergeBalances(
			members,
			computeBalanceDeltas(
				[dinner],
				[
					{
						id: 's1',
						fromMemberId: sam.id,
						toMemberId: alex.id,
						amountMinor: 4000,
						settledDate: '2026-08-29',
						note: null
					}
				]
			)
		);
		expect(balances.map((b) => b.balanceMinor)).toEqual([0, 0]);
	});

	it('keeps members with no activity in the roster', () => {
		const balances = mergeBalances(members, []);
		expect(balances).toHaveLength(2);
		expect(balances.every((b) => b.balanceMinor === 0)).toBe(true);
	});

	it('refuses a delta for someone outside the group', () => {
		expect(() => mergeBalances(members, [{ memberId: 'gm-ghost', balanceMinor: 100 }])).toThrow(
			/not in the group/
		);
	});

	it('sums to zero for a three-way split that does not divide evenly', () => {
		// Whole percentages force 34/33/33, and a zero-decimal currency has no
		// cents to hide a rounding error in. If largest-remainder ever slipped,
		// this is where it would show.
		const jordan: MemberSummary = {
			id: 'gm-jordan',
			groupId: 'g',
			person: { id: 'p-jordan', name: 'Jordan', avatarColor: 'emerald', isSelf: false }
		};
		const trio = [alex, sam, jordan];

		const apartment: ExpenseView = {
			id: 'e2',
			description: 'Apartment',
			notes: null,
			totalMinor: 1_250_000,
			expenseDate: '2026-08-14',
			payerMemberId: jordan.id,
			category: null,
			splits: buildSplits(1_250_000, [
				{ memberId: alex.id, sharePct: 34 },
				{ memberId: sam.id, sharePct: 33 },
				{ memberId: jordan.id, sharePct: 33 }
			])
		};

		const payment: SettlementView = {
			id: 's2',
			fromMemberId: alex.id,
			toMemberId: jordan.id,
			amountMinor: 100_000,
			settledDate: '2026-08-15',
			note: null
		};

		expect(apartment.splits.reduce((sum, split) => sum + split.shareMinor, 0)).toBe(1_250_000);

		const balances = mergeBalances(trio, computeBalanceDeltas([apartment], [payment]));
		expect(() => assertBalancesSumToZero(balances)).not.toThrow();
	});
});

describe('computeMemberLedger', () => {
	const settlement = {
		id: 's1',
		fromMemberId: sam.id,
		toMemberId: alex.id,
		amountMinor: 2000,
		settledDate: '2026-08-29',
		note: null
	};

	it('breaks the balance into terms that reconcile', () => {
		const ledger = computeMemberLedger(alex.id, [dinner], [settlement]);
		expect(ledger.paidMinor).toBe(10_000);
		expect(ledger.shareMinor).toBe(6000);
		expect(ledger.settlementsSentMinor).toBe(0);
		expect(ledger.settlementsReceivedMinor).toBe(2000);
		expect(ledger.balanceMinor).toBe(2000);
	});

	it('agrees with the balance the group screen shows', () => {
		// The breakdown panel must never contradict the figure beside it.
		const expenses = [dinner];
		const settlements = [settlement];
		const balances = mergeBalances(members, computeBalanceDeltas(expenses, settlements));

		for (const balance of balances) {
			const ledger = computeMemberLedger(balance.memberId, expenses, settlements);
			expect(ledger.balanceMinor).toBe(balance.balanceMinor);
			expect(
				ledger.paidMinor -
					ledger.shareMinor +
					ledger.settlementsSentMinor -
					ledger.settlementsReceivedMinor
			).toBe(balance.balanceMinor);
		}
	});
});

describe('simplifyDebts', () => {
	const balanceOf = (memberId: string, balanceMinor: number): MemberBalance => ({
		memberId,
		person: { id: memberId, name: memberId, avatarColor: null, isSelf: false },
		balanceMinor
	});

	it('settles the worked example in one transfer', () => {
		const transfers = simplifyDebts([balanceOf(alex.id, 4000), balanceOf(sam.id, -4000)]);
		expect(transfers).toEqual([{ fromMemberId: sam.id, toMemberId: alex.id, amountMinor: 4000 }]);
	});

	it('clears every balance and needs at most n-1 transfers', () => {
		const balances = [
			balanceOf('a', 5000),
			balanceOf('b', 3000),
			balanceOf('c', -6000),
			balanceOf('d', -2000)
		];
		const transfers = simplifyDebts(balances);
		expect(transfers.length).toBeLessThanOrEqual(balances.length - 1);

		const applied = new Map(balances.map((b) => [b.memberId, b.balanceMinor]));
		for (const t of transfers) {
			applied.set(t.fromMemberId, applied.get(t.fromMemberId)! + t.amountMinor);
			applied.set(t.toMemberId, applied.get(t.toMemberId)! - t.amountMinor);
		}
		expect([...applied.values()].every((v) => v === 0)).toBe(true);
	});

	it('suggests nothing when everyone is settled', () => {
		expect(simplifyDebts([balanceOf('a', 0), balanceOf('b', 0)])).toEqual([]);
	});

	it('is stable when the input is reordered', () => {
		const balances = [balanceOf('a', 5000), balanceOf('b', -3000), balanceOf('c', -2000)];
		expect(simplifyDebts([...balances].reverse())).toEqual(simplifyDebts(balances));
	});
});

describe('wording', () => {
	it('names the payer rather than addressing a viewer', () => {
		// There is no session, so there is nobody for "you" to mean.
		const { title, detail } = describeExpense(dinner, members, USD);
		expect(title).toBe('Alex paid $100.00 for Dinner.');
		expect(detail).toBe('Alex lent $40.00 and Sam owes $40.00.');
	});

	it('reads the same way whoever paid', () => {
		const paidBySam: ExpenseView = { ...dinner, payerMemberId: sam.id };
		const { title, detail } = describeExpense(paidBySam, members, USD);
		expect(title).toBe('Sam paid $100.00 for Dinner.');
		expect(detail).toBe('Sam lent $60.00 and Alex owes $60.00.');
	});

	it('says so when the payer covered the whole thing', () => {
		const solo: ExpenseView = {
			...dinner,
			splits: buildSplits(10_000, [{ memberId: alex.id, sharePct: 100 }])
		};
		expect(describeExpense(solo, members, USD).detail).toBe('Alex covered this one alone.');
	});

	it('captions balances by sign, leaving the name to the row beside it', () => {
		expect(describeBalance({ memberId: alex.id, person: alex.person, balanceMinor: 4000 })).toBe(
			'Is owed'
		);
		expect(describeBalance({ memberId: alex.id, person: alex.person, balanceMinor: -1 })).toBe(
			'Owes'
		);
		expect(describeBalance({ memberId: sam.id, person: sam.person, balanceMinor: 0 })).toBe(
			'Settled up'
		);
	});

	it('describes a suggested transfer', () => {
		expect(
			describeTransfer(
				{ fromMemberId: sam.id, toMemberId: alex.id, amountMinor: 4000 },
				members,
				USD
			)
		).toBe('Sam pays Alex $40.00');
	});
});
