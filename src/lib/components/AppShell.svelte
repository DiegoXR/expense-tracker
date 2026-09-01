<script lang="ts">
	import type { Snippet } from 'svelte';

	// The design target is mobile portrait. Wider screens get the same single
	// column, centred — there is no desktop layout, by choice.
	let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto min-h-dvh w-full max-w-[440px] pb-[env(safe-area-inset-bottom)]">
	{@render children()}
</div>
