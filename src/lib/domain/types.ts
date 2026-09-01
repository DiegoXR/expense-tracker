/**
 * The contract between page loaders and components, derived from the Drizzle schema
 * so a column rename is a compile error. The import below is type-only and erases.
 */

import type {
	Category,
	Currency,
	Expense,
	ExpenseSplit,
	Group,
	GroupMember,
	Person,
	Settlement
} from '$lib/server/db/schema';

/** Everything needed to parse and render an amount. */
export type CurrencyMeta = Pick<
	Currency,
	'code' | 'symbol' | 'decimals' | 'locale' | 'allowDecimals'
>;

export type PersonSummary = Pick<Person, 'id' | 'name' | 'avatarColor' | 'isSelf'>;

/** A person as seen inside one group. `id` is the membership id. */
export type MemberSummary = Pick<GroupMember, 'id' | 'groupId'> & {
	person: PersonSummary;
};

export type CategorySummary = Pick<Category, 'id' | 'name' | 'icon' | 'color'>;

export type ExpenseSplitView = Pick<ExpenseSplit, 'memberId' | 'sharePct' | 'shareMinor'>;

export type ExpenseView = Pick<
	Expense,
	'id' | 'description' | 'notes' | 'totalMinor' | 'expenseDate' | 'payerMemberId'
> & {
	category: CategorySummary | null;
	splits: ExpenseSplitView[];
};

export type SettlementView = Pick<
	Settlement,
	'id' | 'fromMemberId' | 'toMemberId' | 'amountMinor' | 'settledDate' | 'note'
>;

export type GroupSummary = Pick<Group, 'id' | 'name' | 'description'> & {
	currency: CurrencyMeta;
};

export type GroupView = GroupSummary & {
	members: MemberSummary[];
};
