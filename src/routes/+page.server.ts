import { fail, type Actions } from '@sveltejs/kit';
import { archiveCategory, createCategory, listCategories } from '$lib/server/queries/categories';
import { listCurrencies } from '$lib/server/queries/currencies';
import { listGroupsWithTotals, createGroup } from '$lib/server/queries/groups';
import { archivePerson, createPerson, listPeople } from '$lib/server/queries/people';
import type { PageServerLoad } from './$types';

/** Trimmed text, or null when the field was blank. */
function text(data: FormData, field: string): string | null {
	const value = data.get(field);
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export const load: PageServerLoad = async ({ locals }) => {
	const [groups, people, currencies, categories] = await Promise.all([
		listGroupsWithTotals(locals.db),
		listPeople(locals.db),
		listCurrencies(locals.db),
		listCategories(locals.db)
	]);

	return { groups, people, currencies, categories };
};

export const actions: Actions = {
	createGroup: async ({ request, locals }) => {
		const data = await request.formData();
		const name = text(data, 'name');
		const currencyCode = text(data, 'currencyCode');

		if (!name) return fail(400, { field: 'name', message: 'Give the group a name.' });
		if (!currencyCode) return fail(400, { field: 'currencyCode', message: 'Pick a currency.' });

		// The currency has to exist: `groups.currency_code` is a foreign key, so a
		// crafted POST would otherwise fail at the database with an opaque error.
		const currencies = await listCurrencies(locals.db);
		if (!currencies.some((currency) => currency.code === currencyCode)) {
			return fail(400, { field: 'currencyCode', message: 'Unknown currency.' });
		}

		const personIds = data
			.getAll('personId')
			.filter((value): value is string => typeof value === 'string');

		await createGroup(locals.db, {
			name,
			description: text(data, 'description'),
			currencyCode,
			personIds
		});

		return { success: true };
	},

	createPerson: async ({ request, locals }) => {
		const data = await request.formData();
		const name = text(data, 'name');
		if (!name) return fail(400, { field: 'name', message: 'Give the person a name.' });

		// `people.name` is unique, so a duplicate is a validation error, not a 500.
		const existing = await listPeople(locals.db);
		if (existing.some((person) => person.name.toLowerCase() === name.toLowerCase())) {
			return fail(400, { field: 'name', message: `${name} is already on the list.` });
		}

		await createPerson(locals.db, { name, avatarColor: text(data, 'avatarColor') });
		return { success: true };
	},

	createCategory: async ({ request, locals }) => {
		const data = await request.formData();
		const name = text(data, 'name');
		if (!name) return fail(400, { field: 'categoryName', message: 'Give the category a name.' });

		// `categories.name` is unique, so a duplicate is a validation error, not a 500.
		const existing = await listCategories(locals.db);
		if (existing.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
			return fail(400, { field: 'categoryName', message: `${name} already exists.` });
		}

		await createCategory(locals.db, { name });
		return { success: true };
	},

	archiveCategory: async ({ request, locals }) => {
		const data = await request.formData();
		const categoryId = text(data, 'categoryId');
		if (!categoryId) return fail(400, { message: 'No category given.' });

		await archiveCategory(locals.db, categoryId);
		return { success: true };
	},

	archivePerson: async ({ request, locals }) => {
		const data = await request.formData();
		const personId = text(data, 'personId');
		if (!personId) return fail(400, { message: 'No person given.' });

		await archivePerson(locals.db, personId);
		return { success: true };
	}
};
