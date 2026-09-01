<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, action }: { title: string; action?: Snippet } = $props();
</script>

<header class="flex items-end justify-between gap-3 px-4 pt-6 pb-4">
	<h1 class="text-[34px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
	{#if action}
		<div class="pb-2">{@render action()}</div>
	{/if}
</header>
