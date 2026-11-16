/**
 * Nothing in this app can be prerendered: every page reads the D1 binding, and
 * the Cloudflare adapter hands prerendering a `platform` proxy that *throws* the
 * moment `platform.env` is touched. Declaring it once at the root turns a
 * confusing build-time crash into a rule.
 */
export const prerender = false;
