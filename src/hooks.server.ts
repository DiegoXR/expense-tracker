import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireDatabaseBinding, requireEnv } from '$lib/server/platform';

/**
 * Attaches a request-scoped Drizzle client to `event.locals`.
 *
 * Constructing it is object wiring, not I/O, so doing it for every request costs
 * nothing. Phase 4 composes a second handler here for the session.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const env = requireEnv(event.platform);
	event.locals.db = getDb(requireDatabaseBinding(env));
	return resolve(event);
};
