<script lang="ts">
	import { parsePercent } from '$lib/domain/money';

	let {
		pct = $bindable(0),
		label,
		id,
		invalid = false
	}: { pct?: number; label: string; id: string; invalid?: boolean } = $props();

	// null means "show whatever pct is". Only while the field is being edited do
	// we hold raw text, so a programmatic change ("Give rest") is picked up
	// without an effect fighting the user's keystrokes.
	let draft = $state<string | null>(null);
	const display = $derived(draft ?? String(pct));

	function onInput(event: Event) {
		draft = (event.currentTarget as HTMLInputElement).value;
		try {
			pct = draft.trim() === '' ? 0 : parsePercent(draft);
		} catch {
			pct = 0;
		}
	}
</script>

<div class="flex items-center gap-1">
	<label for={id} class="sr-only">{label}</label>
	<input
		{id}
		type="text"
		inputmode="numeric"
		autocomplete="off"
		value={display}
		aria-invalid={invalid ? 'true' : undefined}
		oninput={onInput}
		onblur={() => (draft = null)}
		data-money
		class="min-h-11 w-14 rounded-md border border-chrome bg-surface px-2 text-end text-[17px] text-ink outline-none focus:border-ink"
	/>
	<span class="text-[15px] text-subtle">%</span>
</div>
