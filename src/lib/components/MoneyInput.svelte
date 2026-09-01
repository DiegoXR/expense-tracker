<script lang="ts">
	import { untrack } from 'svelte';
	import { formatMinorPlain, parseMinor } from '$lib/domain/money';
	import type { CurrencyMeta } from '$lib/domain/types';
	import FieldError from './FieldError.svelte';

	let {
		minor = $bindable(0),
		currency,
		name,
		id = name,
		label,
		placeholder = '0'
	}: {
		minor?: number;
		currency: CurrencyMeta;
		name: string;
		id?: string;
		label: string;
		placeholder?: string;
	} = $props();

	// Raw text is kept separate so typing "12." is not clobbered by reformatting.
	// Seeded once: a group has one currency, and after mount the text belongs to
	// the user. The sheet unmounts on close, so reopening starts clean.
	let text = $state(untrack(() => (minor ? formatMinorPlain(minor, currency.decimals) : '')));
	let error = $state<string | undefined>(undefined);

	function onInput(event: Event) {
		text = (event.currentTarget as HTMLInputElement).value;
		if (text.trim() === '') {
			minor = 0;
			error = undefined;
			return;
		}
		try {
			minor = parseMinor(text, currency);
			error = undefined;
		} catch (cause) {
			minor = 0;
			error = cause instanceof Error ? cause.message : 'Invalid amount.';
		}
	}

	function onBlur() {
		if (!error && minor > 0) text = formatMinorPlain(minor, currency.decimals);
	}
</script>

<div>
	<label for={id} class="block text-[13px] font-medium text-subtle">{label}</label>
	<div class="mt-1 flex items-baseline gap-2">
		<span class="text-[22px] text-subtle">{currency.symbol}</span>
		<input
			{id}
			type="text"
			inputmode={currency.allowDecimals ? 'decimal' : 'numeric'}
			autocomplete="off"
			value={text}
			{placeholder}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			oninput={onInput}
			onblur={onBlur}
			data-money
			class="min-h-11 w-full bg-transparent text-[28px] font-semibold text-ink outline-none placeholder:text-chrome"
		/>
	</div>
	<!-- The server recomputes from percentages; this hidden field is the amount. -->
	<input type="hidden" {name} value={minor} />
	<FieldError id="{id}-error" message={error} />
</div>
