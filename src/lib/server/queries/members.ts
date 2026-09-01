import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { groupMembers } from '$lib/server/db/schema';

/**
 * Adds a person to a group, or un-removes them if they were here before.
 *
 * `(group_id, person_id)` is unique, so a plain insert would fail for someone
 * who left and came back. Reviving the old row is also the honest thing to do:
 * their earlier expenses still point at it.
 */
export async function addMember(db: Database, groupId: string, personId: string): Promise<void> {
	const [existing] = await db
		.select({ id: groupMembers.id })
		.from(groupMembers)
		.where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.personId, personId)));

	if (existing) {
		await db.update(groupMembers).set({ removedAt: null }).where(eq(groupMembers.id, existing.id));
		return;
	}

	await db.insert(groupMembers).values({ groupId, personId });
}

/** Soft removal — expenses and settlements keep pointing at the membership. */
export async function removeMember(db: Database, memberId: string): Promise<void> {
	await db
		.update(groupMembers)
		.set({ removedAt: new Date() })
		.where(and(eq(groupMembers.id, memberId), isNull(groupMembers.removedAt)));
}
