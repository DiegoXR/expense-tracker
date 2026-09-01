<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BackHeader from '$lib/components/BackHeader.svelte';
	import BalanceBadge from '$lib/components/BalanceBadge.svelte';
	import Card from '$lib/components/Card.svelte';
	import CurrencyText from '$lib/components/CurrencyText.svelte';
	import DateField from '$lib/components/DateField.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import MemberAvatar from '$lib/components/MemberAvatar.svelte';
	import MoneyInput from '$lib/components/MoneyInput.svelte';
	import PercentageSplitEditor from '$lib/components/PercentageSplitEditor.svelte';
	import Row from '$lib/components/Row.svelte';
	import SettlementSuggestion from '$lib/components/SettlementSuggestion.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { computeBalanceDeltas, mergeBalances } from '$lib/domain/balance';
	import {
		mockCategories,
		mockExpensesByGroup,
		mockGroup,
		mockSettlementsByGroup
	} from '$lib/domain/mock';
	import { simplifyDebts } from '$lib/domain/settle';
	import type { ExpenseView } from '$lib/domain/types';
	import { describeExpense } from '$lib/domain/wording';

	// Phase 1b: mock data, read straight from the route param. Phase 3 swaps this
	// for a load function; every component below already takes props.
	const group = $derived(mockGroup(page.params.groupId ?? ''));
	const expenses = $derived(mockExpensesByGroup[group.id] ?? []);
	const settlements = $derived(mockSettlementsByGroup[group.id] ?? []);

	const balances = $derived(
		mergeBalances(group.members, computeBalanceDeltas(expenses, settlements))
	);
	const transfers = $derived(simplifyDebts(balances));
	const totalMinor = $derived(expenses.reduce((sum, expense) => sum + expense.totalMinor, 0));

	type DrawerName = 'expense' | 'detail' | 'payment' | 'members' | 'settings';
	let drawer = $state<DrawerName | null>(null);
	let selected = $state<ExpenseView | null>(null);

	// New-expense form state. It lives here, in the page: domain/ owns the
	// calculations, the component owns what is happening right now.
	let draftTotalMinor = $state(0);
	let draftDate = $state(new Date().toISOString().slice(0, 10));
	let draftShares = $state<Record<string, number>>({});

	function openExpense() {
		const even = Math.floor(100 / group.members.length);
		draftShares = Object.fromEntries(
			group.members.map((member, i) => [
				member.id,
				// Whole percentages never divide evenly by three, so the first row
				// absorbs the remainder and the editor opens already valid.
				i === 0 ? 100 - even * (group.members.length - 1) : even
			])
		);
		draftTotalMinor = 0;
		drawer = 'expense';
	}

	function openDetail(expense: ExpenseView) {
		selected = expense;
		drawer = 'detail';
	}
</script>

<BackHeader
	href={resolve('/')}
	backLabel="Groups"
	title={group.name}
	subtitle={group.description ?? undefined}
>
	{#snippet action()}
		<Button size="sm" onclick={openExpense}>Add</Button>
	{/snippet}
</BackHeader>

<Card title="Balances" footnote="Balances in a group always add up to zero.">
	{#each balances as balance (balance.memberId)}
		{@const member = group.members.find((candidate) => candidate.id === balance.memberId)}
		<Row label={member?.person.name ?? 'Unknown'} chevron={false}>
			{#snippet leading()}
				{#if member}
					<MemberAvatar person={member.person} />
				{/if}
			{/snippet}
			{#snippet trailing()}
				<BalanceBadge {balance} currency={group.currency} />
			{/snippet}
		</Row>
	{/each}
</Card>

{#if transfers.length > 0}
	<Card title="Settle up" footnote="Suggestions only — nothing is recorded until you confirm.">
		{#each transfers as transfer (transfer.fromMemberId + transfer.toMemberId)}
			<SettlementSuggestion
				{transfer}
				members={group.members}
				currency={group.currency}
				onrecord={() => (drawer = 'payment')}
			/>
		{/each}
	</Card>
{/if}

<ExpenseList {expenses} members={group.members} currency={group.currency} onselect={openDetail} />

<Card title="Group">
	<Row label="Members" value={String(group.members.length)} onclick={() => (drawer = 'members')} />
	<Row label="Total spend" chevron={false}>
		{#snippet trailing()}
			<CurrencyText minor={totalMinor} currency={group.currency} class="text-[15px] text-subtle" />
		{/snippet}
	</Row>
	<Row label="Group settings" onclick={() => (drawer = 'settings')} />
</Card>

<div class="px-4 pb-6">
	<Button class="min-h-12 w-full" onclick={openExpense}>Add expense</Button>
</div>

<Drawer
	open={drawer === 'expense'}
	onclose={() => (drawer = null)}
	title="New expense"
	description="Who paid, how much, and how it splits."
>
	<form class="space-y-5 pb-2">
		<div>
			<label for="expense-description" class="block text-[13px] font-medium text-subtle">
				Description
			</label>
			<input
				id="expense-description"
				name="description"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			/>
		</div>

		<MoneyInput
			bind:minor={draftTotalMinor}
			currency={group.currency}
			name="totalMinor"
			label="Amount"
		/>

		<div>
			<label for="expense-payer" class="block text-[13px] font-medium text-subtle">Paid by</label>
			<select
				id="expense-payer"
				name="payerMemberId"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			>
				{#each group.members as member (member.id)}
					<option value={member.id}>{member.person.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="expense-category" class="block text-[13px] font-medium text-subtle">
				Category
			</label>
			<select
				id="expense-category"
				name="categoryId"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			>
				{#each mockCategories as category (category.id)}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>
		</div>

		<DateField bind:value={draftDate} name="expenseDate" label="Date" />

		<PercentageSplitEditor
			members={group.members}
			totalMinor={draftTotalMinor}
			currency={group.currency}
			bind:shares={draftShares}
		/>
	</form>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Save expense</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'detail'}
	onclose={() => (drawer = null)}
	title={selected?.description ?? 'Expense'}
	description={selected ? describeExpense(selected, group.members, group.currency).title : ''}
>
	{#if selected}
		<div class="card overflow-hidden rounded-card bg-surface">
			{#each selected.splits as split (split.memberId)}
				{@const member = group.members.find((candidate) => candidate.id === split.memberId)}
				<Row
					label={member?.person.name ?? 'Unknown'}
					sublabel="{split.sharePct}% of the total"
					chevron={false}
				>
					{#snippet leading()}
						{#if member}
							<MemberAvatar person={member.person} />
						{/if}
					{/snippet}
					{#snippet trailing()}
						<CurrencyText
							minor={split.shareMinor}
							currency={group.currency}
							class="text-[17px] text-ink"
						/>
					{/snippet}
				</Row>
			{/each}
		</div>
	{/if}
	{#snippet footer()}
		<Button variant="outline" class="min-h-12 w-full" disabled>Edit expense</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'payment'}
	onclose={() => (drawer = null)}
	title="Record a payment"
	description="A real transfer between two members, to clear a debt."
>
	<form class="space-y-5 pb-2">
		<MoneyInput currency={group.currency} name="amountMinor" label="Amount" />
		<DateField value={draftDate} name="settledDate" label="Date" />
	</form>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Record payment</Button>
	{/snippet}
</Drawer>

<Drawer open={drawer === 'members'} onclose={() => (drawer = null)} title="Members">
	<div class="card overflow-hidden rounded-card bg-surface">
		{#each group.members as member (member.id)}
			<Row
				label={member.person.name}
				value={member.person.isSelf ? 'You' : undefined}
				chevron={false}
			>
				{#snippet leading()}
					<MemberAvatar person={member.person} />
				{/snippet}
			</Row>
		{/each}
	</div>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Add member</Button>
	{/snippet}
</Drawer>

<Drawer open={drawer === 'settings'} onclose={() => (drawer = null)} title="Group settings">
	<div class="card overflow-hidden rounded-card bg-surface">
		<Row label="Rename group" />
		<Row label="Currency" value={group.currency.code} chevron={false} />
		<Row label="Archive group" />
		<Row label="Delete group" muted />
	</div>
</Drawer>

<style>
	.card :global([data-row]:not(:last-child) [data-row-body]) {
		border-bottom: 1px solid var(--color-chrome);
	}
</style>
