import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { people } from '$lib/server/db/schema';
import type { PersonSummary } from '$lib/domain/types';

/** Everyone who can be added to a group, archived people excluded. */
export function listPeople(db: Database): Promise<PersonSummary[]> {
	return db
		.select({
			id: people.id,
			name: people.name,
			avatarColor: people.avatarColor,
			isSelf: people.isSelf
		})
		.from(people)
		.where(isNull(people.archivedAt))
		.orderBy(asc(people.name));
}

export async function createPerson(
	db: Database,
	input: { name: string; avatarColor: string | null }
): Promise<void> {
	await db.insert(people).values({ name: input.name, avatarColor: input.avatarColor });
}

export async function renamePerson(db: Database, personId: string, name: string): Promise<void> {
	await db.update(people).set({ name }).where(eq(people.id, personId));
}

/**
 * Marks one person as the ledger keeper, clearing whoever held it.
 *
 * A partial unique index allows only one row with `is_self = 1`, so the clear
 * has to land first — hence a batch rather than two awaits, which D1 could
 * interleave with another request and leave two selves for an instant.
 */
export async function setSelf(db: Database, personId: string): Promise<void> {
	await db.batch([
		db.update(people).set({ isSelf: false }).where(ne(people.id, personId)),
		db.update(people).set({ isSelf: true }).where(eq(people.id, personId))
	]);
}

/** Soft delete: memberships and history keep pointing at the row. */
export async function archivePerson(db: Database, personId: string): Promise<void> {
	await db
		.update(people)
		.set({ archivedAt: new Date() })
		.where(and(eq(people.id, personId), isNull(people.archivedAt)));
}
