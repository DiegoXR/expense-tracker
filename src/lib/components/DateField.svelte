<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	// A native date input round-trips 'YYYY-MM-DD' with zero JS, which is exactly
	// the storage format — which is why shadcn's calendar was skipped.
	//
	// The input itself is invisible and stretched over a styled face (icon plus
	// the formatted day): tapping anywhere on the field lands on the real input,
	// so the phone opens its own picker. Shown as-is, iOS gave the input a
	// minimum width wider than the sheet and no icon at all.
	let {
		value = $bindable(''),
		name,
		id = name,
		label
	}: { value?: string; name: string; id?: string; label: string } = $props();

	// Parsed as UTC on purpose: the value is a calendar day, and the local
	// timezone must not shift it. Same rule as the expense list.
	const display = $derived(
		value
			? new Intl.DateTimeFormat('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					timeZone: 'UTC'
				}).format(new Date(`${value}T00:00:00Z`))
			: ''
	);

	/** Desktop browsers only open the picker from their own small icon. */
	function openPicker(event: MouseEvent) {
		try {
			(event.currentTarget as HTMLInputElement).showPicker();
		} catch {
			// Unsupported or already open: the native behaviour still applies.
		}
	}
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-subtle">{label}</label>
	<div
		class="relative mt-1 flex min-h-11 w-full items-center gap-2 rounded-md border border-chrome bg-surface px-3 text-[17px] focus-within:border-ink"
	>
		<CalendarIcon class="size-5 shrink-0 text-subtle" aria-hidden="true" />
		<span class="truncate {display ? 'text-ink' : 'text-subtle'}" aria-hidden="true">
			{display || 'Pick a date'}
		</span>
		<input
			{id}
			{name}
			type="date"
			bind:value
			onclick={openPicker}
			class="absolute inset-0 size-full min-w-0 cursor-pointer appearance-none opacity-0"
		/>
	</div>
</div>
