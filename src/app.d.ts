// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			/** Drizzle client bound to this request's D1 instance. */
			db: import('$lib/server/db').Database;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
