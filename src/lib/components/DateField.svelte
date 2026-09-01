<script lang="ts">
	// A native date input round-trips 'YYYY-MM-DD' with zero JS, which is exactly
	// the storage format — which is why shadcn's calendar was skipped.
	let {
		value = $bindable(''),
		name,
		id = name,
		label
	}: { value?: string; name: string; id?: string; label: string } = $props();
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-subtle">{label}</label>
	<input
		{id}
		{name}
		type="date"
		bind:value
		class="mt-1 min-h-11 w-full rounded-md border border-chrome bg-surface px-3 text-[17px] text-ink outline-none focus:border-ink"
	/>
</div>
