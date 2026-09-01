<script lang="ts" module>
	// The second documented exception to the palette: a dot, never a fill.
	const CATEGORY_COLORS: Record<string, string> = {
		emerald: 'bg-emerald-500',
		indigo: 'bg-indigo-500',
		amber: 'bg-amber-500',
		sky: 'bg-sky-500',
		violet: 'bg-violet-500',
		rose: 'bg-rose-500',
		slate: 'bg-subtle'
	};
</script>

<script lang="ts">
	import type { CategorySummary } from '$lib/domain/types';

	let { category }: { category: CategorySummary } = $props();

	const dot = $derived(CATEGORY_COLORS[category.color] ?? 'bg-subtle');
</script>

<span class="inline-flex items-center gap-1.5 text-[13px] text-subtle">
	<span class="size-2 shrink-0 rounded-full {dot}" aria-hidden="true"></span>
	{category.name}
</span>
