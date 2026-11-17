import { and, asc, eq, isNull } from 'drizzle-orm';
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

/** Soft delete: memberships and history keep pointing at the row. */
export async function archivePerson(db: Database, personId: string): Promise<void> {
	await db
		.update(people)
		.set({ archivedAt: new Date() })
		.where(and(eq(people.id, personId), isNull(people.archivedAt)));
}
