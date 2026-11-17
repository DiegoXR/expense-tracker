import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import { PERCENT_TOTAL } from '$lib/domain/money';
import type { SplitInput } from '$lib/domain/split';
import type { GroupView } from '$lib/domain/types';
import type { Database } from '$lib/server/db';
import { getGroupBalances } from '$lib/server/queries/balances';
import { listCategories } from '$lib/server/queries/categories';
import {
	createExpense,
	deleteExpense,
	expenseBelongsToGroup,
	listExpenses,
	updateExpense
} from '$lib/server/queries/expenses';
import { archiveGroup, deleteGroup, getGroup, updateGroup } from '$lib/server/queries/groups';
import { addMember, removeMember } from '$lib/server/queries/members';
import { listPeople } from '$lib/server/queries/people';
import { deleteSettlement, listSettlements } from '$lib/server/queries/settlements';
import type { PageServerLoad } from './$types';

/**
 * SvelteKit types route params as possibly absent. For this route the param is
 * always there, but narrowing it once beats asserting it at a dozen call sites.
 */
function requireGroupId(params: { groupId?: string }): string {
	if (!params.groupId) error(404, 'No such group.');
	return params.groupId;
}

function text(data: FormData, field: string): string | null {
	const value = data.get(field);
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

/** A positive integer, or null. Amounts arrive as minor units already. */
function positiveInt(data: FormData, field: string): number | null {
	const raw = text(data, field);
	if (raw === null) return null;
	const value = Number(raw);
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function loadGroup(db: Database, groupId: string): Promise<GroupView> {
	const group = await getGroup(db, groupId);
	if (!group) error(404, 'No such group.');
	return group;
}

/**
 * Turns the split editor's parallel hidden fields into percentages, validating
 * every one of them.
 *
 * The browser disables submit until the shares reach 100%, but that is UX and
 * never security: a crafted POST skips it entirely. The amounts are not read
 * from the request at all — `createExpense` derives them from these percentages
 * with the same function the editor used for its preview.
 */
function parseShares(
	data: FormData,
	group: GroupView
): { shares: SplitInput[] } | { message: string } {
	const memberIds = data.getAll('splitMemberId').map(String);
	const percentages = data.getAll('splitPct').map(String);

	if (memberIds.length === 0) return { message: 'Split the expense between someone.' };
	if (memberIds.length !== percentages.length) return { message: 'The split is malformed.' };
	if (new Set(memberIds).size !== memberIds.length) {
		return { message: 'A member appears twice in the split.' };
	}

	const shares: SplitInput[] = [];
	for (const [index, memberId] of memberIds.entries()) {
		// Membership must be active *in this group*: the composite foreign key
		// would catch a foreign member too, but with an opaque database error.
		if (!group.members.some((member) => member.id === memberId)) {
			return { message: 'The split names someone who is not in this group.' };
		}

		const sharePct = Number(percentages[index]);
		if (!Number.isInteger(sharePct) || sharePct < 0 || sharePct > PERCENT_TOTAL) {
			return { message: 'Shares must be whole numbers between 0 and 100.' };
		}
		shares.push({ memberId, sharePct });
	}

	const total = shares.reduce((sum, share) => sum + share.sharePct, 0);
	if (total !== PERCENT_TOTAL) {
		return { message: `The split adds up to ${total}%, not 100%.` };
	}

	return { shares };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const groupId = requireGroupId(params);
	const group = await loadGroup(locals.db, groupId);

	const [expenses, settlements, categories, people] = await Promise.all([
		listExpenses(locals.db, groupId),
		listSettlements(locals.db, groupId),
		listCategories(locals.db),
		listPeople(locals.db)
	]);

	const balances = await getGroupBalances(locals.db, groupId, group.members);

	return {
		group,
		expenses,
		settlements,
		categories,
		balances,
		/** Everyone not already in this group, for the add-member drawer. */
		candidates: people.filter(
			(person) => !group.members.some((member) => member.person.id === person.id)
		)
	};
};

/**
 * Every action re-reads the group from `params.groupId` rather than trusting a
 * form field, so a crafted POST cannot act on a group the URL does not name.
 */
export const actions: Actions = {
	createExpense: async ({ params, request, locals }) => {
		const groupId = requireGroupId(params);
		const group = await loadGroup(locals.db, groupId);
		const data = await request.formData();

		const description = text(data, 'description');
		if (!description) return fail(400, { field: 'description', message: 'Describe the expense.' });

		const totalMinor = positiveInt(data, 'totalMinor');
		if (!totalMinor) return fail(400, { field: 'totalMinor', message: 'Enter an amount.' });

		const payerMemberId = text(data, 'payerMemberId');
		if (!payerMemberId || !group.members.some((member) => member.id === payerMemberId)) {
			return fail(400, { field: 'payerMemberId', message: 'The payer must be a member.' });
		}

		const expenseDate = text(data, 'expenseDate');
		if (!expenseDate || !ISO_DATE.test(expenseDate)) {
			return fail(400, { field: 'expenseDate', message: 'Pick a date.' });
		}

		const categoryId = text(data, 'categoryId');
		if (categoryId) {
			const categories = await listCategories(locals.db);
			if (!categories.some((category) => category.id === categoryId)) {
				return fail(400, { field: 'categoryId', message: 'Unknown category.' });
			}
		}

		const parsed = parseShares(data, group);
		if ('message' in parsed) return fail(400, { field: 'split', message: parsed.message });

		await createExpense(locals.db, {
			groupId,
			payerMemberId,
			categoryId,
			description,
			notes: text(data, 'notes'),
			totalMinor,
			expenseDate,
			shares: parsed.shares
		});

		return { success: true };
	},

	updateExpense: async ({ params, request, locals }) => {
		const groupId = requireGroupId(params);
		const group = await loadGroup(locals.db, groupId);
		const data = await request.formData();

		const expenseId = text(data, 'expenseId');
		if (!expenseId || !(await expenseBelongsToGroup(locals.db, groupId, expenseId))) {
			return fail(400, { message: 'That expense is not in this group.' });
		}

		const description = text(data, 'description');
		if (!description) return fail(400, { field: 'description', message: 'Describe the expense.' });

		const totalMinor = positiveInt(data, 'totalMinor');
		if (!totalMinor) return fail(400, { field: 'totalMinor', message: 'Enter an amount.' });

		const payerMemberId = text(data, 'payerMemberId');
		if (!payerMemberId || !group.members.some((member) => member.id === payerMemberId)) {
			return fail(400, { field: 'payerMemberId', message: 'The payer must be a member.' });
		}

		const expenseDate = text(data, 'expenseDate');
		if (!expenseDate || !ISO_DATE.test(expenseDate)) {
			return fail(400, { field: 'expenseDate', message: 'Pick a date.' });
		}

		const parsed = parseShares(data, group);
		if ('message' in parsed) return fail(400, { field: 'split', message: parsed.message });

		await updateExpense(locals.db, expenseId, {
			payerMemberId,
			categoryId: text(data, 'categoryId'),
			description,
			notes: text(data, 'notes'),
			totalMinor,
			expenseDate,
			shares: parsed.shares
		});

		return { success: true };
	},

	deleteExpense: async ({ params, request, locals }) => {
		const groupId = requireGroupId(params);
		const data = await request.formData();
		const expenseId = text(data, 'expenseId');
		if (!expenseId) return fail(400, { message: 'No expense given.' });

		await deleteExpense(locals.db, groupId, expenseId);
		return { success: true };
	},

	deleteSettlement: async ({ params, request, locals }) => {
		const groupId = requireGroupId(params);
		const data = await request.formData();
		const settlementId = text(data, 'settlementId');
		if (!settlementId) return fail(400, { message: 'No payment given.' });

		await deleteSettlement(locals.db, groupId, settlementId);
		return { success: true };
	},

	addMember: async ({ params, request, locals }) => {
		const data = await request.formData();
		const personId = text(data, 'personId');
		if (!personId) return fail(400, { message: 'Pick a person to add.' });

		const people = await listPeople(locals.db);
		if (!people.some((person) => person.id === personId)) {
			return fail(400, { message: 'Unknown person.' });
		}

		await addMember(locals.db, requireGroupId(params), personId);
		return { success: true };
	},

	removeMember: async ({ params, request, locals }) => {
		const data = await request.formData();
		const memberId = text(data, 'memberId');
		if (!memberId) return fail(400, { message: 'No member given.' });

		const group = await loadGroup(locals.db, requireGroupId(params));

		// Membership ids are UUIDs, but checking anyway keeps one group from
		// removing another group's member by guessing an id.
		if (!group.members.some((member) => member.id === memberId)) {
			return fail(400, { message: 'That member is not in this group.' });
		}

		await removeMember(locals.db, memberId);
		return { success: true };
	},

	updateGroup: async ({ params, request, locals }) => {
		const data = await request.formData();
		const name = text(data, 'name');
		if (!name) return fail(400, { field: 'name', message: 'Give the group a name.' });

		await updateGroup(locals.db, requireGroupId(params), {
			name,
			description: text(data, 'description')
		});
		return { success: true };
	},

	archiveGroup: async ({ params, locals }) => {
		await archiveGroup(locals.db, requireGroupId(params));
		redirect(303, '/');
	},

	deleteGroup: async ({ params, request, locals }) => {
		const data = await request.formData();
		const groupId = requireGroupId(params);
		const group = await loadGroup(locals.db, groupId);

		// Typing the name is the confirmation. Deleting takes the expenses with it,
		// and unlike Archive there is nothing to undo.
		if (text(data, 'confirmName') !== group.name) {
			return fail(400, { field: 'confirmName', message: `Type "${group.name}" to confirm.` });
		}

		await deleteGroup(locals.db, groupId);
		redirect(303, '/');
	}
};
