<script lang="ts">
	import MemberAvatar from './MemberAvatar.svelte';
	import type { PersonSummary } from '$lib/domain/types';

	let {
		people,
		max = 3,
		size = 'sm'
	}: {
		people: PersonSummary[];
		max?: number;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const shown = $derived(people.slice(0, max));
	const overflow = $derived(people.length - shown.length);
</script>

<span class="flex items-center -space-x-2">
	{#each shown as person (person.id)}
		<span class="rounded-full ring-2 ring-surface">
			<MemberAvatar {person} {size} />
		</span>
	{/each}
	{#if overflow > 0}
		<span
			class="inline-flex size-7 items-center justify-center rounded-full bg-chrome text-[12px] font-medium text-ink ring-2 ring-surface"
		>
			+{overflow}
		</span>
	{/if}
</span>
