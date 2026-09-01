<script lang="ts">
	import { formatMinor } from '$lib/domain/money';
	import type { CurrencyMeta } from '$lib/domain/types';

	let {
		minor,
		currency,
		signed = false,
		class: className = ''
	}: {
		minor: number;
		currency: CurrencyMeta;
		signed?: boolean;
		class?: string;
	} = $props();
</script>

<span data-money class={className}>{formatMinor(minor, currency, { signed })}</span>
