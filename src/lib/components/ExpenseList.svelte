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

	// One board, newest first, hairlines between rows — the same shape the group
	// list uses on the overview. Each row carries its own date, so grouping the
	// list into a card per day only added chrome.
	const ordered = $derived([...expenses].sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1)));
</script>

<Card title="Expenses">
	{#if ordered.length === 0}
		<EmptyState title="No expenses yet" description="Add the first one to start the ledger." />
	{:else}
		{#each ordered as expense (expense.id)}
			<ExpenseRow {expense} {members} {currency} {onselect} />
		{/each}
	{/if}
</Card>
