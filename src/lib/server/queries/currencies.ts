import { asc, eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { currencies } from '$lib/server/db/schema';
import type { CurrencyMeta } from '$lib/domain/types';

/** The currencies a new group may choose from. Seeded by `seed/currencies.sql`. */
export function listCurrencies(db: Database): Promise<CurrencyMeta[]> {
	return db
		.select({
			code: currencies.code,
			symbol: currencies.symbol,
			decimals: currencies.decimals,
			locale: currencies.locale,
			allowDecimals: currencies.allowDecimals
		})
		.from(currencies)
		.where(eq(currencies.isActive, true))
		.orderBy(asc(currencies.sortOrder));
}
