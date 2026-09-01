<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { CurrencyMeta, ExpenseView, MemberSummary } from '$lib/domain/types';
	import CategoryPill from './CategoryPill.svelte';
	import CurrencyText from './CurrencyText.svelte';

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

	// Parsed as UTC on purpose: the stored value is a calendar day, and letting
	// the local timezone shift it is exactly the bug the TEXT column avoids.
	const day = $derived(
		new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${expense.expenseDate}T00:00:00Z`))
	);
</script>

<button
	data-row
	type="button"
	onclick={() => onselect?.(expense)}
	class="flex w-full items-stretch gap-3 ps-4 text-start"
>
	<div data-row-body class="flex min-h-11 flex-1 items-center gap-3 py-3.5 pe-4">
		<div class="min-w-0 flex-1">
			<div class="truncate text-[17px] leading-tight text-ink">{expense.description}</div>
			<div class="flex items-center gap-1.5 truncate pt-1 text-[13px] leading-tight text-subtle">
				<span>{day}</span>
				{#if expense.category}
					<span aria-hidden="true">·</span>
					<CategoryPill category={expense.category} />
				{/if}
			</div>
			<div class="truncate pt-1 text-[13px] leading-tight text-subtle">
				Paid by {payer?.person.name ?? 'someone'}
			</div>
		</div>
		<CurrencyText minor={expense.totalMinor} {currency} class="shrink-0 text-[17px] text-ink" />
		<ChevronRightIcon class="size-5 shrink-0 text-chrome" aria-hidden="true" />
	</div>
</button>
