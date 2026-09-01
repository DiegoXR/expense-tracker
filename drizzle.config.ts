import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit does exactly one job here: turn `schema.ts` into SQL migrations.
 * Wrangler applies them, locally and remotely — see CLAUDE.md §5.
 *
 * There is deliberately no `driver` and no `dbCredentials`. Those only matter for
 * commands that reach across the network, and we have none: `wrangler login`
 * authenticates the tooling, and the Worker reaches D1 through its `DB` binding
 * with no credential at all. That leaves nothing here to leak or rotate, and
 * `pnpm db:generate` works on a fresh clone with no `.env`.
 */
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
