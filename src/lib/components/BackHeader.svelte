<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import type { Snippet } from 'svelte';

	let {
		href,
		backLabel = 'Back',
		title,
		subtitle,
		action
	}: {
		href: string;
		backLabel?: string;
		title: string;
		subtitle?: string;
		action?: Snippet;
	} = $props();
</script>

<header class="px-4 pt-4 pb-4">
	<a {href} class="-ms-1 inline-flex min-h-11 items-center gap-0.5 text-[17px] text-subtle">
		<ChevronLeftIcon class="size-5" aria-hidden="true" />
		{backLabel}
	</a>
	<div class="flex items-end justify-between gap-3">
		<div>
			<h1 class="text-[34px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
			{#if subtitle}
				<p class="mt-0.5 text-[15px] text-subtle">{subtitle}</p>
			{/if}
		</div>
		{#if action}
			<div class="pb-2">{@render action()}</div>
		{/if}
	</div>
</header>
