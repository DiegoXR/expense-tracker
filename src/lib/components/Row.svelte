<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { Snippet } from 'svelte';

	let {
		label,
		sublabel,
		value,
		href,
		onclick,
		chevron,
		leading,
		trailing,
		muted = false
	}: {
		label: string;
		sublabel?: string;
		value?: string;
		href?: string;
		onclick?: () => void;
		/** Defaults to true when the row navigates or opens something. */
		chevron?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
		muted?: boolean;
	} = $props();

	const interactive = $derived(Boolean(href || onclick));
	const showChevron = $derived(chevron ?? interactive);
</script>

{#snippet body()}
	<!-- 44px minimum: this is a phone, and nothing here is hover-only. -->
	<div data-row-body class="flex min-h-11 flex-1 items-center gap-3 py-2.5 pe-4 text-start">
		<div class="min-w-0 flex-1">
			<div class="truncate text-[17px] leading-tight {muted ? 'text-subtle' : 'text-ink'}">
				{label}
			</div>
			{#if sublabel}
				<div class="truncate pt-0.5 text-[15px] leading-tight text-subtle">{sublabel}</div>
			{/if}
		</div>

		{#if trailing}
			{@render trailing()}
		{:else if value}
			<!-- Plain text: amounts come through `trailing` with CurrencyText, which
			     is what carries the tabular figures. -->
			<span class="shrink-0 text-[15px] text-subtle">{value}</span>
		{/if}

		{#if showChevron}
			<ChevronRightIcon class="size-5 shrink-0 text-chrome" aria-hidden="true" />
		{/if}
	</div>
{/snippet}

{#snippet inner()}
	{#if leading}
		<span class="shrink-0 py-2.5">{@render leading()}</span>
	{/if}
	{@render body()}
{/snippet}

{#if href}
	<a data-row {href} class="flex w-full items-stretch gap-3 ps-4">{@render inner()}</a>
{:else if onclick}
	<button data-row type="button" {onclick} class="flex w-full items-stretch gap-3 ps-4">
		{@render inner()}
	</button>
{:else}
	<div data-row class="flex w-full items-stretch gap-3 ps-4">{@render inner()}</div>
{/if}
