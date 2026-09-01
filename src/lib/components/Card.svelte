<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, footnote, children }: { title?: string; footnote?: string; children: Snippet } =
		$props();
</script>

<section class="px-4 pb-5">
	{#if title}
		<h2 class="px-4 pb-2 text-[13px] font-medium tracking-wide text-subtle uppercase">
			{title}
		</h2>
	{/if}
	<div class="card overflow-hidden rounded-card bg-surface">
		{@render children()}
	</div>
	{#if footnote}
		<p class="px-4 pt-2 text-[13px] leading-snug text-subtle">{footnote}</p>
	{/if}
</section>

<style>
	/*
	 * Hairline dividers between rows, inset to line up with the label rather
	 * than running full-bleed under the icon — the detail that makes a stack of
	 * rows read as one grouped block. Living here rather than in Row means a row
	 * never has to know whether it is the last one.
	 */
	.card :global([data-row]:not(:last-child) [data-row-body]) {
		border-bottom: 1px solid var(--color-chrome);
	}
</style>
