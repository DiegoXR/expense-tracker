import { and, asc, desc, eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { settlements } from '$lib/server/db/schema';
import type { SettlementView } from '$lib/domain/types';

export function listSettlements(db: Database, groupId: string): Promise<SettlementView[]> {
	return db
		.select({
			id: settlements.id,
			fromMemberId: settlements.fromMemberId,
			toMemberId: settlements.toMemberId,
			amountMinor: settlements.amountMinor,
			settledDate: settlements.settledDate,
			note: settlements.note
		})
		.from(settlements)
		.where(eq(settlements.groupId, groupId))
		.orderBy(desc(settlements.settledDate), asc(settlements.id));
}

export async function deleteSettlement(
	db: Database,
	groupId: string,
	settlementId: string
): Promise<void> {
	await db
		.delete(settlements)
		.where(and(eq(settlements.id, settlementId), eq(settlements.groupId, groupId)));
}
