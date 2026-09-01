import type { LayoutServerLoad } from './$types';

/**
 * Nothing in this app can be prerendered: every page reads the D1 binding, and
 * the Cloudflare adapter hands prerendering a `platform` proxy that *throws* the
 * moment `platform.env` is touched. Declaring it once at the root turns a
 * confusing build-time crash into a rule.
 */
export const prerender = false;

/** Phase 4 adds the session here so the nav can render a logout button. */
export const load: LayoutServerLoad = async () => {
	return {};
};
