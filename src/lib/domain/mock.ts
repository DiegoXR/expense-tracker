/**
 * Fake data for building the UI before the database exists. The only source of mock
 * data in the app — Phase 2/3 deletes this file as each page gains a real loader.
 */

import { buildSplits } from './split';
import type {
	CategorySummary,
	CurrencyMeta,
	ExpenseView,
	GroupView,
	MemberSummary,
	SettlementView
} from './types';

export const mockCurrencies: Record<'USD' | 'COP' | 'CAD', CurrencyMeta> = {
	USD: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US', allowDecimals: true },
	COP: { code: 'COP', symbol: '$', decimals: 0, locale: 'es-CO', allowDecimals: false },
	CAD: { code: 'CAD', symbol: '$', decimals: 2, locale: 'en-CA', allowDecimals: true }
};

export const mockCategories: CategorySummary[] = [
	{ id: 'cat-groceries', name: 'Groceries', icon: 'shopping-cart', color: 'emerald' },
	{ id: 'cat-rent', name: 'Rent', icon: 'house', color: 'indigo' },
	{ id: 'cat-dining', name: 'Dining out', icon: 'utensils', color: 'amber' },
	{ id: 'cat-transport', name: 'Transport', icon: 'car', color: 'sky' },
	{ id: 'cat-utilities', name: 'Utilities', icon: 'plug', color: 'violet' }
];

const alex = { id: 'person-alex', name: 'Alex', avatarColor: 'indigo', isSelf: true };
const sam = { id: 'person-sam', name: 'Sam', avatarColor: 'rose', isSelf: false };
const jordan = { id: 'person-jordan', name: 'Jordan', avatarColor: 'emerald', isSelf: false };

export const mockPeople = [alex, sam, jordan];

const homeMembers: MemberSummary[] = [
	{ id: 'gm-home-alex', groupId: 'group-home', person: alex },
	{ id: 'gm-home-sam', groupId: 'group-home', person: sam }
];

const tripMembers: MemberSummary[] = [
	{ id: 'gm-trip-alex', groupId: 'group-trip', person: alex },
	{ id: 'gm-trip-sam', groupId: 'group-trip', person: sam },
	{ id: 'gm-trip-jordan', groupId: 'group-trip', person: jordan }
];

export const mockGroups: GroupView[] = [
	{
		id: 'group-home',
		name: 'Home',
		description: 'Shared apartment costs',
		currency: mockCurrencies.USD,
		members: homeMembers
	},
	{
		id: 'group-trip',
		name: 'Weekend trip',
		description: 'Long weekend, March',
		currency: mockCurrencies.COP,
		members: tripMembers
	}
];

/** Builds an expense with its splits resolved the same way the server will. */
function mockExpense(
	expense: Omit<ExpenseView, 'splits'>,
	shares: { memberId: string; sharePct: number }[]
): ExpenseView {
	return { ...expense, splits: buildSplits(expense.totalMinor, shares) };
}

export const mockExpensesByGroup: Record<string, ExpenseView[]> = {
	'group-home': [
		// The worked example from the docs: 100.00 paid by one member, split 60/40.
		mockExpense(
			{
				id: 'exp-home-1',
				description: 'Dinner',
				notes: null,
				totalMinor: 10_000,
				expenseDate: '2026-08-28',
				payerMemberId: 'gm-home-alex',
				category: mockCategories[2]
			},
			[
				{ memberId: 'gm-home-alex', sharePct: 60 },
				{ memberId: 'gm-home-sam', sharePct: 40 }
			]
		),
		mockExpense(
			{
				id: 'exp-home-2',
				description: 'Weekly groceries',
				notes: null,
				totalMinor: 8_450,
				expenseDate: '2026-08-25',
				payerMemberId: 'gm-home-sam',
				category: mockCategories[0]
			},
			[
				{ memberId: 'gm-home-alex', sharePct: 50 },
				{ memberId: 'gm-home-sam', sharePct: 50 }
			]
		),
		mockExpense(
			{
				id: 'exp-home-3',
				description: 'August rent',
				notes: 'Split by room size',
				totalMinor: 140_000,
				expenseDate: '2026-08-01',
				payerMemberId: 'gm-home-alex',
				category: mockCategories[1]
			},
			[
				{ memberId: 'gm-home-alex', sharePct: 55 },
				{ memberId: 'gm-home-sam', sharePct: 45 }
			]
		)
	],
	'group-trip': [
		// Three ways with whole percentages never divides evenly — exercises the
		// odd-unit allocation on a zero-decimal currency.
		mockExpense(
			{
				id: 'exp-trip-1',
				description: 'Apartment',
				notes: null,
				totalMinor: 1_250_000,
				expenseDate: '2026-08-14',
				payerMemberId: 'gm-trip-jordan',
				category: mockCategories[1]
			},
			[
				{ memberId: 'gm-trip-alex', sharePct: 34 },
				{ memberId: 'gm-trip-sam', sharePct: 33 },
				{ memberId: 'gm-trip-jordan', sharePct: 33 }
			]
		),
		mockExpense(
			{
				id: 'exp-trip-2',
				description: 'Airport taxi',
				notes: null,
				totalMinor: 85_000,
				expenseDate: '2026-08-14',
				payerMemberId: 'gm-trip-alex',
				category: mockCategories[3]
			},
			[
				{ memberId: 'gm-trip-alex', sharePct: 34 },
				{ memberId: 'gm-trip-sam', sharePct: 33 },
				{ memberId: 'gm-trip-jordan', sharePct: 33 }
			]
		)
	]
};

export const mockSettlementsByGroup: Record<string, SettlementView[]> = {
	'group-home': [
		{
			id: 'set-home-1',
			fromMemberId: 'gm-home-sam',
			toMemberId: 'gm-home-alex',
			amountMinor: 2_000,
			settledDate: '2026-08-29',
			note: 'Partial, rest next week'
		}
	],
	'group-trip': []
};

export function mockGroup(groupId: string): GroupView {
	const group = mockGroups.find((candidate) => candidate.id === groupId);
	if (!group) throw new Error(`No mock group with id ${groupId}`);
	return group;
}
