/**
 * `event.platform` is `App.Platform | undefined` and genuinely absent outside the
 * Cloudflare runtime: while prerendering, in non-adapter builds, and in unit
 * tests. These accessors turn that into one loud, actionable error instead of a
 * `TypeError` on `undefined` three frames deep.
 */

export function requireEnv(platform: App.Platform | undefined): Env {
	if (!platform?.env) {
		throw new Error(
			'platform.env is unavailable. This code ran outside the Cloudflare runtime — ' +
				'usually a prerendered route. Set `export const prerender = false`.'
		);
	}
	return platform.env;
}

export function requireDatabaseBinding(env: Env): D1Database {
	if (!env.DB) {
		throw new Error(
			'The D1 binding "DB" is missing. Add a d1_databases entry to wrangler.jsonc, ' +
				'then run `pnpm gen`.'
		);
	}
	return env.DB;
}
