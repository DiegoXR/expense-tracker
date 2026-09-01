<script lang="ts">
	import CurrencyText from './CurrencyText.svelte';
	import { describeBalance } from '$lib/domain/wording';
	import type { MemberBalance } from '$lib/domain/balance';
	import type { CurrencyMeta } from '$lib/domain/types';

	// Sign and caption carry the meaning, not colour — so this still reads
	// correctly to someone who cannot tell red from green.
	let {
		balance,
		currency,
		align = 'end'
	}: {
		balance: MemberBalance;
		currency: CurrencyMeta;
		align?: 'start' | 'end';
	} = $props();

	const settled = $derived(balance.balanceMinor === 0);
</script>

<span class="flex flex-col {align === 'end' ? 'items-end' : 'items-start'}">
	<CurrencyText
		minor={balance.balanceMinor}
		{currency}
		signed={!settled}
		class="text-[17px] leading-tight {settled ? 'text-subtle' : 'font-semibold text-ink'}"
	/>
	<span class="pt-0.5 text-[13px] leading-tight text-subtle">{describeBalance(balance)}</span>
</span>
