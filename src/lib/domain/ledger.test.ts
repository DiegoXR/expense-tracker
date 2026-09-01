import { describe, expect, it } from 'vitest';
import {
	assertBalancesSumToZero,
	computeBalanceDeltas,
	mergeBalances,
	type MemberBalance
} from './balance';
import { mockExpensesByGroup, mockGroups, mockSettlementsByGroup } from './mock';
import { simplifyDebts } from './settle';
import { buildSplits } from './split';
import { describeBalance, describeExpense, describeTransfer } from './wording';
import type { CurrencyMeta, ExpenseView, MemberSummary } from './types';

const USD: CurrencyMeta = {
	code: 'USD',
	symbol: '$',
	decimals: 2,
	locale: 'en-US',
	allowDecimals: true
};

const viewer: MemberSummary = {
	id: 'gm-alex',
	groupId: 'g',
	person: { id: 'p-alex', name: 'Alex', avatarColor: 'indigo', isSelf: true }
};
const other: MemberSummary = {
	id: 'gm-sam',
	groupId: 'g',
	person: { id: 'p-sam', name: 'Sam', avatarColor: 'rose', isSelf: false }
};
const members = [viewer, other];

/** The worked example from the docs: the viewer pays 100.00, split 60/40. */
const dinner: ExpenseView = {
	id: 'e1',
	description: 'Dinner',
	notes: null,
	totalMinor: 10_000,
	expenseDate: '2026-08-28',
	payerMemberId: viewer.id,
	category: null,
	splits: buildSplits(10_000, [
		{ memberId: viewer.id, sharePct: 60 },
		{ memberId: other.id, sharePct: 40 }
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
			{ memberId: viewer.id, person: viewer.person, balanceMinor: 4000 },
			{ memberId: other.id, person: other.person, balanceMinor: -4000 }
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
						fromMemberId: other.id,
						toMemberId: viewer.id,
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

	it('sums to zero for every mock group', () => {
		for (const group of mockGroups) {
			const balances = mergeBalances(
				group.members,
				computeBalanceDeltas(
					mockExpensesByGroup[group.id] ?? [],
					mockSettlementsByGroup[group.id] ?? []
				)
			);
			expect(() => assertBalancesSumToZero(balances)).not.toThrow();
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
		const transfers = simplifyDebts([balanceOf(viewer.id, 4000), balanceOf(other.id, -4000)]);
		expect(transfers).toEqual([
			{ fromMemberId: other.id, toMemberId: viewer.id, amountMinor: 4000 }
		]);
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
	it('describes the expense from the viewer point of view', () => {
		const { title, detail } = describeExpense(dinner, members, USD);
		expect(title).toBe('You paid $100.00 for Dinner.');
		expect(detail).toBe('You lent $40.00 and Sam owes $40.00.');
	});

	it('switches to third person when someone else paid', () => {
		const paidByOther: ExpenseView = { ...dinner, payerMemberId: other.id };
		const { title, detail } = describeExpense(paidByOther, members, USD);
		expect(title).toBe('Sam paid $100.00 for Dinner.');
		expect(detail).toBe('Sam lent $60.00 and you owe $60.00.');
	});

	it('says so when the payer covered the whole thing', () => {
		const solo: ExpenseView = {
			...dinner,
			splits: buildSplits(10_000, [{ memberId: viewer.id, sharePct: 100 }])
		};
		expect(describeExpense(solo, members, USD).detail).toBe('You covered this one yourself.');
	});

	it('captions balances by sign and by who is looking', () => {
		expect(
			describeBalance({ memberId: viewer.id, person: viewer.person, balanceMinor: 4000 })
		).toBe('You are owed');
		expect(describeBalance({ memberId: viewer.id, person: viewer.person, balanceMinor: -1 })).toBe(
			'You owe'
		);
		expect(describeBalance({ memberId: other.id, person: other.person, balanceMinor: -4000 })).toBe(
			'Sam owes'
		);
		expect(describeBalance({ memberId: viewer.id, person: viewer.person, balanceMinor: 0 })).toBe(
			'Settled up'
		);
	});

	it('describes a suggested transfer', () => {
		expect(
			describeTransfer(
				{ fromMemberId: other.id, toMemberId: viewer.id, amountMinor: 4000 },
				members,
				USD
			)
		).toBe('Sam pays you $40.00');
	});
});
