/**
 * Removes generated build output from .svelte-kit/.
 *
 * Why this exists: tsconfig.json sets `checkJs: true`, and svelte-check scans the
 * whole workspace rather than just the tsconfig file set (a tsconfig `exclude` has
 * no effect on it). After `vite build`, the adapter writes JS into .svelte-kit/ —
 * including `*.svelte.js` files, which Svelte 5 treats as real modules — so
 * `pnpm build && pnpm check` would report hundreds of errors in code we never
 * wrote. Cleaning first makes the two commands order-independent.
 *
 * Only build artifacts are removed. `.svelte-kit/types` and `.svelte-kit/tsconfig.json`
 * come from `svelte-kit sync` and are required for checking, so they stay.
 *
 * Each directory is handled independently and a lock is never fatal: on Windows a
 * running `vite dev` holds `.svelte-kit/cloudflare` open, and refusing to type-check
 * just because a dev server is up would be worse than the stale output we are
 * trying to avoid.
 */
import { rmSync } from 'node:fs';

const GENERATED_DIRS = [
	'.svelte-kit/output',
	'.svelte-kit/cloudflare',
	'.svelte-kit/cloudflare-tmp'
];

const locked = [];

for (const dir of GENERATED_DIRS) {
	try {
		rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
	} catch (error) {
		if (error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
			locked.push(dir);
			continue;
		}
		throw error;
	}
}

if (locked.length > 0) {
	console.warn(
		`\nCould not remove ${locked.join(', ')} — a running dev server is holding it open.\n` +
			'Type-checking anyway. If you see errors in .svelte-kit/**, stop `pnpm dev` and re-run.\n'
	);
}
