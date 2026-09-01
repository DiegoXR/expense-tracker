<script lang="ts">
	import { describeExpense } from '$lib/domain/wording';
	import type { CurrencyMeta, ExpenseView, MemberSummary } from '$lib/domain/types';
	import CategoryPill from './CategoryPill.svelte';
	import CurrencyText from './CurrencyText.svelte';
	import MemberAvatar from './MemberAvatar.svelte';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		expense,
		members,
		currency,
		onselect
	}: {
		expense: ExpenseView;
		members: MemberSummary[];
		currency: CurrencyMeta;
		onselect?: (expense: ExpenseView) => void;
	} = $props();

	const payer = $derived(members.find((member) => member.id === expense.payerMemberId));
	const described = $derived(describeExpense(expense, members, currency));
</script>

<button
	data-row
	type="button"
	onclick={() => onselect?.(expense)}
	class="flex w-full items-stretch gap-3 ps-4 text-start"
>
	<span class="shrink-0 py-3">
		{#if payer}
			<MemberAvatar person={payer.person} />
		{/if}
	</span>
	<div data-row-body class="flex min-h-11 flex-1 items-center gap-3 py-3 pe-4">
		<div class="min-w-0 flex-1">
			<div class="truncate text-[17px] leading-tight text-ink">{expense.description}</div>
			<div class="truncate pt-0.5 text-[15px] leading-tight text-subtle">{described.detail}</div>
			{#if expense.category}
				<div class="pt-1"><CategoryPill category={expense.category} /></div>
			{/if}
		</div>
		<CurrencyText minor={expense.totalMinor} {currency} class="shrink-0 text-[17px] text-ink" />
		<ChevronRightIcon class="size-5 shrink-0 text-chrome" aria-hidden="true" />
	</div>
</button>
