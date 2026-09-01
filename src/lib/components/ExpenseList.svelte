<script lang="ts">
	import type { CurrencyMeta, ExpenseView, MemberSummary } from '$lib/domain/types';
	import Card from './Card.svelte';
	import EmptyState from './EmptyState.svelte';
	import ExpenseRow from './ExpenseRow.svelte';

	let {
		expenses,
		members,
		currency,
		onselect
	}: {
		expenses: ExpenseView[];
		members: MemberSummary[];
		currency: CurrencyMeta;
		onselect?: (expense: ExpenseView) => void;
	} = $props();

	/** Newest first, then grouped under one heading per calendar day. */
	const days = $derived.by(() => {
		const byDate: Record<string, ExpenseView[]> = {};
		for (const expense of [...expenses].sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1))) {
			(byDate[expense.expenseDate] ??= []).push(expense);
		}
		// Date keys are not integer-like, so insertion order survives.
		return Object.entries(byDate);
	});

	function formatDay(isoDate: string): string {
		// Parsed as UTC on purpose: the stored value is a calendar day, and
		// letting the local timezone shift it is exactly the bug we avoided.
		const date = new Date(`${isoDate}T00:00:00Z`);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}
</script>

{#if days.length === 0}
	<Card title="Expenses">
		<EmptyState title="No expenses yet" description="Add the first one to start the ledger." />
	</Card>
{:else}
	{#each days as [isoDate, dayExpenses] (isoDate)}
		<Card title={formatDay(isoDate)}>
			{#each dayExpenses as expense (expense.id)}
				<ExpenseRow {expense} {members} {currency} {onselect} />
			{/each}
		</Card>
	{/each}
{/if}
