<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		footnote,
		action,
		dividers = true,
		children
	}: {
		title?: string;
		footnote?: string;
		/** Sits opposite the title, on the section header line. */
		action?: Snippet;
		/** Hairlines between rows. Off for short blocks that read better plain. */
		dividers?: boolean;
		children: Snippet;
	} = $props();
</script>

<section class="px-4 pb-5">
	{#if title || action}
		<div class="flex min-h-8 items-center justify-between gap-3 px-4 pb-2">
			<h2 class="text-[13px] font-medium tracking-wide text-subtle uppercase">
				{title ?? ''}
			</h2>
			{#if action}
				{@render action()}
			{/if}
		</div>
	{/if}
	<div class="overflow-hidden rounded-card bg-surface" class:card={dividers}>
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
