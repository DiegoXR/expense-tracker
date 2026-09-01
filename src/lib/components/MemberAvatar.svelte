<script lang="ts" module>
	// Avatar colour is one of the two documented exceptions to the five-token
	// palette: a small circle that makes a person findable in a dense list.
	// Written out in full because Tailwind cannot see a class built at runtime.
	const AVATAR_COLORS: Record<string, string> = {
		indigo: 'bg-indigo-500',
		rose: 'bg-rose-500',
		emerald: 'bg-emerald-500',
		amber: 'bg-amber-500',
		sky: 'bg-sky-500',
		violet: 'bg-violet-500',
		teal: 'bg-teal-500',
		orange: 'bg-orange-500'
	};

	const SIZES = {
		sm: 'size-7 text-[12px]',
		md: 'size-9 text-[14px]',
		lg: 'size-11 text-[17px]'
	};

	export function initialsOf(name: string): string {
		const parts = name.trim().split(/\s+/).slice(0, 2);
		return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
	}
</script>

<script lang="ts">
	import type { PersonSummary } from '$lib/domain/types';

	let { person, size = 'md' }: { person: PersonSummary; size?: keyof typeof SIZES } = $props();

	const tint = $derived(AVATAR_COLORS[person.avatarColor ?? ''] ?? 'bg-subtle');
</script>

<span
	class="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white {tint} {SIZES[
		size
	]}"
	title={person.name}
>
	{initialsOf(person.name)}
</span>
