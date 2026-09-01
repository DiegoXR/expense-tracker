import { relations, sql } from 'drizzle-orm';
import {
	check,
	foreignKey,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

/* ------------------------------------------------------------------ *
 * Shared column builders
 * ------------------------------------------------------------------ */

const pk = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`);

const updatedAt = () =>
	integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
		.$onUpdate(() => new Date());

/**
 * A calendar date as 'YYYY-MM-DD'. An expense happens on a day, not an instant.
 * Sidesteps timezone bugs and round-trips `<input type="date">` unchanged.
 */
const isoDate = (name: string) => text(name);

/** Matches 'YYYY-MM-DD'. SQLite has no regex, but GLOB is enough here. */
const isoDatePattern = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

/* ------------------------------------------------------------------ *
 * Currencies
 * ------------------------------------------------------------------ */

/**
 * Supported currencies, seeded with USD, COP and CAD. `decimals` is the authority
 * on storage and rendering, which is why money columns are `*_minor`, not `*_cents`.
 */
export const currencies = sqliteTable(
	'currencies',
	{
		/** ISO 4217 code, e.g. 'USD'. Natural primary key — these never change. */
		code: text('code').primaryKey(),
		name: text('name').notNull(),
		symbol: text('symbol').notNull(),
		/** Digits after the decimal point. 2 for USD/CAD, 0 for COP. */
		decimals: integer('decimals').notNull().default(2),
		/** BCP 47 tag handed to Intl.NumberFormat, e.g. 'en-US'. */
		locale: text('locale').notNull().default('en-US'),
		/** When false, amounts must be whole major units. False for COP. */
		allowDecimals: integer('allow_decimals', { mode: 'boolean' }).notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0),
		isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		check('currencies_code_is_iso4217', sql`length(${t.code}) = 3`),
		check('currencies_decimals_in_range', sql`${t.decimals} >= 0 AND ${t.decimals} <= 4`),
		// A currency with no minor unit cannot allow decimals; keeps the two columns
		// from ever contradicting each other.
		check('currencies_decimals_consistent', sql`${t.allowDecimals} = 0 OR ${t.decimals} > 0`)
	]
);

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

/**
 * A person, independent of any group. The same person can belong to many groups,
 * which is why membership lives in `group_members` rather than here.
 */
export const people = sqliteTable(
	'people',
	{
		id: pk(),
		name: text('name').notNull(),
		/**
		 * At most one person is "me", enforced by the partial unique index below.
		 * Only preselects the payer on a new expense — the UI never addresses a viewer.
		 */
		isSelf: integer('is_self', { mode: 'boolean' }).notNull().default(false),
		/** Tailwind color token used for the avatar, e.g. 'emerald'. */
		avatarColor: text('avatar_color'),
		archivedAt: integer('archived_at', { mode: 'timestamp' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('people_name_unique').on(t.name),
		uniqueIndex('people_single_self_unique')
			.on(t.isSelf)
			.where(sql`${t.isSelf} = 1`)
	]
);

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

/**
 * A shared ledger with exactly one currency. Mixing currencies would need dated
 * exchange rates, which is out of scope — make a second group instead.
 */
export const groups = sqliteTable('groups', {
	id: pk(),
	name: text('name').notNull(),
	description: text('description'),
	currencyCode: text('currency_code')
		.notNull()
		.references(() => currencies.code, { onDelete: 'restrict' }),
	archivedAt: integer('archived_at', { mode: 'timestamp' }),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

/* ------------------------------------------------------------------ *
 * Group members (person <-> group)
 * ------------------------------------------------------------------ */

/**
 * A person's membership in a group. Expenses reference the membership, not the
 * person, so someone who leaves keeps their financial history attributable.
 */
export const groupMembers = sqliteTable(
	'group_members',
	{
		id: pk(),
		groupId: text('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		personId: text('person_id')
			.notNull()
			.references(() => people.id, { onDelete: 'restrict' }),
		joinedAt: integer('joined_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		/** Soft removal — history keeps pointing here, so we never hard-delete. */
		removedAt: integer('removed_at', { mode: 'timestamp' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('group_members_group_person_unique').on(t.groupId, t.personId),
		// Target for the composite foreign keys on expenses and settlements. Those
		// reference (id, group_id) together, which is how the database itself
		// proves a payer belongs to the group the expense is filed under.
		uniqueIndex('group_members_id_group_unique').on(t.id, t.groupId),
		index('group_members_person_idx').on(t.personId)
	]
);

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

/**
 * Expense categories, global rather than per-group so spending reports can cross
 * groups. "Groceries" means the same thing everywhere.
 */
export const categories = sqliteTable(
	'categories',
	{
		id: pk(),
		name: text('name').notNull(),
		/** Lucide icon name, e.g. 'shopping-cart'. */
		icon: text('icon').notNull().default('circle-dashed'),
		/** Tailwind color token, e.g. 'emerald'. */
		color: text('color').notNull().default('slate'),
		sortOrder: integer('sort_order').notNull().default(0),
		archivedAt: integer('archived_at', { mode: 'timestamp' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('categories_name_unique').on(t.name)]
);

/* ------------------------------------------------------------------ *
 * Expenses
 * ------------------------------------------------------------------ */

/** One purchase, paid by one member, owed by some or all members. */
export const expenses = sqliteTable(
	'expenses',
	{
		id: pk(),
		groupId: text('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		/** Enforced compositely with groupId — see the foreign key below. */
		payerMemberId: text('payer_member_id').notNull(),
		categoryId: text('category_id').references(() => categories.id, { onDelete: 'restrict' }),
		description: text('description').notNull(),
		notes: text('notes'),
		/** Total in the group currency's minor unit. See `currencies.decimals`. */
		totalMinor: integer('total_minor').notNull(),
		expenseDate: isoDate('expense_date').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		foreignKey({
			name: 'expenses_payer_is_group_member_fk',
			columns: [t.payerMemberId, t.groupId],
			foreignColumns: [groupMembers.id, groupMembers.groupId]
		}).onDelete('restrict'),
		index('expenses_group_date_idx').on(t.groupId, t.expenseDate),
		index('expenses_payer_idx').on(t.payerMemberId),
		index('expenses_category_idx').on(t.categoryId),
		check('expenses_total_minor_positive', sql`${t.totalMinor} > 0`),
		check('expenses_date_is_iso', sql`${t.expenseDate} GLOB ${sql.raw(isoDatePattern)}`)
	]
);

/* ------------------------------------------------------------------ *
 * Expense splits
 * ------------------------------------------------------------------ */

/**
 * How one expense is divided: the percentage typed, and the amount owed. Storing
 * the amount means rounding happens once at write time and never drifts.
 */
export const expenseSplits = sqliteTable(
	'expense_splits',
	{
		id: pk(),
		expenseId: text('expense_id')
			.notNull()
			.references(() => expenses.id, { onDelete: 'cascade' }),
		memberId: text('member_id')
			.notNull()
			.references(() => groupMembers.id, { onDelete: 'restrict' }),
		/** Whole percent, 0-100. Sums to exactly 100 per expense. */
		sharePct: integer('share_pct').notNull(),
		/** This member's share, in minor units. Sums to exactly the expense total. */
		shareMinor: integer('share_minor').notNull()
	},
	(t) => [
		uniqueIndex('expense_splits_expense_member_unique').on(t.expenseId, t.memberId),
		index('expense_splits_member_idx').on(t.memberId),
		check('expense_splits_pct_in_range', sql`${t.sharePct} >= 0 AND ${t.sharePct} <= 100`),
		check('expense_splits_minor_non_negative', sql`${t.shareMinor} >= 0`)
	]
);

/* ------------------------------------------------------------------ *
 * Settlements
 * ------------------------------------------------------------------ */

/**
 * A real payment between two members, made to clear a debt. Without these,
 * balances could only ever grow.
 */
export const settlements = sqliteTable(
	'settlements',
	{
		id: pk(),
		groupId: text('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		fromMemberId: text('from_member_id').notNull(),
		toMemberId: text('to_member_id').notNull(),
		amountMinor: integer('amount_minor').notNull(),
		settledDate: isoDate('settled_date').notNull(),
		note: text('note'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		foreignKey({
			name: 'settlements_from_is_group_member_fk',
			columns: [t.fromMemberId, t.groupId],
			foreignColumns: [groupMembers.id, groupMembers.groupId]
		}).onDelete('restrict'),
		foreignKey({
			name: 'settlements_to_is_group_member_fk',
			columns: [t.toMemberId, t.groupId],
			foreignColumns: [groupMembers.id, groupMembers.groupId]
		}).onDelete('restrict'),
		index('settlements_group_date_idx').on(t.groupId, t.settledDate),
		check('settlements_amount_minor_positive', sql`${t.amountMinor} > 0`),
		check('settlements_distinct_parties', sql`${t.fromMemberId} <> ${t.toMemberId}`),
		check('settlements_date_is_iso', sql`${t.settledDate} GLOB ${sql.raw(isoDatePattern)}`)
	]
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const currenciesRelations = relations(currencies, ({ many }) => ({
	groups: many(groups)
}));

export const peopleRelations = relations(people, ({ many }) => ({
	memberships: many(groupMembers)
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
	currency: one(currencies, {
		fields: [groups.currencyCode],
		references: [currencies.code]
	}),
	members: many(groupMembers),
	expenses: many(expenses),
	settlements: many(settlements)
}));

export const groupMembersRelations = relations(groupMembers, ({ one, many }) => ({
	group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
	person: one(people, { fields: [groupMembers.personId], references: [people.id] }),
	expensesPaid: many(expenses),
	splits: many(expenseSplits),
	settlementsSent: many(settlements, { relationName: 'settlementFrom' }),
	settlementsReceived: many(settlements, { relationName: 'settlementTo' })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
	expenses: many(expenses)
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
	group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
	payer: one(groupMembers, {
		fields: [expenses.payerMemberId],
		references: [groupMembers.id]
	}),
	category: one(categories, {
		fields: [expenses.categoryId],
		references: [categories.id]
	}),
	splits: many(expenseSplits)
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
	expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
	member: one(groupMembers, {
		fields: [expenseSplits.memberId],
		references: [groupMembers.id]
	})
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
	group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
	from: one(groupMembers, {
		fields: [settlements.fromMemberId],
		references: [groupMembers.id],
		relationName: 'settlementFrom'
	}),
	to: one(groupMembers, {
		fields: [settlements.toMemberId],
		references: [groupMembers.id],
		relationName: 'settlementTo'
	})
}));

/* ------------------------------------------------------------------ *
 * Inferred types — the source of truth for the whole app
 * ------------------------------------------------------------------ */

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
