<script lang="ts">
	import { describeTransfer } from '$lib/domain/wording';
	import type { Transfer } from '$lib/domain/settle';
	import type { CurrencyMeta, MemberSummary } from '$lib/domain/types';
	import Row from './Row.svelte';

	// Read-only: a suggestion prefills the settlement form, it never records
	// anything on its own.
	let {
		transfer,
		members,
		currency,
		onrecord
	}: {
		transfer: Transfer;
		members: MemberSummary[];
		currency: CurrencyMeta;
		onrecord?: (transfer: Transfer) => void;
	} = $props();
</script>

<Row
	label={describeTransfer(transfer, members, currency)}
	sublabel="Tap to record this payment"
	onclick={() => onrecord?.(transfer)}
/>
