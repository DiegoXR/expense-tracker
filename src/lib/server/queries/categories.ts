import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import type { CategorySummary } from '$lib/domain/types';

/** Categories an expense can be filed under. Seeded by `seed/categories.sql`. */
export function listCategories(db: Database): Promise<CategorySummary[]> {
	return db
		.select({
			id: categories.id,
			name: categories.name,
			icon: categories.icon,
			color: categories.color
		})
		.from(categories)
		.where(isNull(categories.archivedAt))
		.orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function createCategory(
	db: Database,
	input: { name: string; icon?: string; color?: string }
): Promise<void> {
	await db.insert(categories).values({
		name: input.name,
		...(input.icon ? { icon: input.icon } : {}),
		...(input.color ? { color: input.color } : {})
	});
}

/** Soft delete: expenses filed under it keep their category. */
export async function archiveCategory(db: Database, categoryId: string): Promise<void> {
	await db
		.update(categories)
		.set({ archivedAt: new Date() })
		.where(and(eq(categories.id, categoryId), isNull(categories.archivedAt)));
}
