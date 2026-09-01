<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, description, action }: { title: string; description?: string; action?: Snippet } =
		$props();
</script>

<div class="px-6 py-10 text-center">
	<p class="text-[17px] text-ink">{title}</p>
	{#if description}
		<p class="mx-auto max-w-[28ch] pt-1 text-[15px] leading-snug text-subtle">{description}</p>
	{/if}
	{#if action}
		<div class="pt-4">{@render action()}</div>
	{/if}
</div>
