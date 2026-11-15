<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { PERCENT_TOTAL } from '$lib/domain/money';

	// Buttons, not a text field: focusing a field opens the phone keyboard, which
	// covers half the sheet. Shares move in fixed steps instead of being typed.
	//
	// Controlled: the editor decides what a step means for the other rows too.
	let {
		pct,
		onchange,
		label,
		step = 5,
		invalid = false
	}: {
		pct: number;
		onchange: (pct: number) => void;
		label: string;
		step?: number;
		invalid?: boolean;
	} = $props();

	/**
	 * Lands on the step grid first: an expense saved as 33% steps to 35 or 30,
	 * not 38 or 28, so every value after the first tap is a multiple of `step`.
	 */
	function nudge(direction: 1 | -1) {
		const next =
			direction > 0 ? Math.floor(pct / step) * step + step : Math.ceil(pct / step) * step - step;
		onchange(Math.min(PERCENT_TOTAL, Math.max(0, next)));
	}
</script>

<div role="group" aria-label={label} class="flex shrink-0 items-center">
	<button
		type="button"
		aria-label="Decrease {label}"
		disabled={pct <= 0}
		onclick={() => nudge(-1)}
		class="grid size-10 place-items-center rounded-full border border-chrome text-ink disabled:opacity-40"
	>
		<MinusIcon class="size-4" aria-hidden="true" />
	</button>
	<output
		aria-live="polite"
		data-money
		class="w-14 text-center text-[17px] {invalid ? 'font-semibold text-ink' : 'text-ink'}"
	>
		{pct}%
	</output>
	<button
		type="button"
		aria-label="Increase {label}"
		disabled={pct >= PERCENT_TOTAL}
		onclick={() => nudge(1)}
		class="grid size-10 place-items-center rounded-full border border-chrome text-ink disabled:opacity-40"
	>
		<PlusIcon class="size-4" aria-hidden="true" />
	</button>
</div>
