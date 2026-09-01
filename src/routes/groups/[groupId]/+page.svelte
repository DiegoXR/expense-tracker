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
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import UsersIcon from '@lucide/svelte/icons/users';
	import {
		computeBalanceDeltas,
		computeMemberLedger,
		mergeBalances,
		type MemberBalance
	} from '$lib/domain/balance';
	import {
		mockCategories,
		mockExpensesByGroup,
		mockGroup,
		mockSettlementsByGroup
	} from '$lib/domain/mock';
	import type { ExpenseView } from '$lib/domain/types';
	import { describeBalance, describeExpense } from '$lib/domain/wording';

	// Phase 1b: mock data, read straight from the route param. Phase 3 swaps this
	// for a load function; every component below already takes props.
	const group = $derived(mockGroup(page.params.groupId ?? ''));
	const expenses = $derived(mockExpensesByGroup[group.id] ?? []);
	const settlements = $derived(mockSettlementsByGroup[group.id] ?? []);

	const balances = $derived(
		mergeBalances(group.members, computeBalanceDeltas(expenses, settlements))
	);
	const totalMinor = $derived(expenses.reduce((sum, expense) => sum + expense.totalMinor, 0));

	type DrawerName = 'expense' | 'detail' | 'balance' | 'payment' | 'members' | 'settings';
	let drawer = $state<DrawerName | null>(null);
	let selected = $state<ExpenseView | null>(null);
	let inspected = $state<MemberBalance | null>(null);

	/** The four terms behind the balance shown beside the member's name. */
	const ledger = $derived(
		inspected ? computeMemberLedger(inspected.memberId, expenses, settlements) : null
	);

	// New-expense form state. It lives here, in the page: domain/ owns the
	// calculations, the component owns what is happening right now.
	let draftTotalMinor = $state(0);
	let draftPayerMemberId = $state('');
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
		// The one job `people.is_self` has: the person keeping the ledger enters
		// most of the expenses, so start the payer on them. The UI still names
		// everyone in the third person — this is a default, not a viewpoint.
		draftPayerMemberId =
			group.members.find((member) => member.person.isSelf)?.id ?? group.members[0]?.id ?? '';
		drawer = 'expense';
	}

	/** See the overview page: let the menu close before the sheet takes focus. */
	function openFromMenu(name: DrawerName) {
		setTimeout(() => (drawer = name));
	}

	function openDetail(expense: ExpenseView) {
		selected = expense;
		drawer = 'detail';
	}

	function openBalance(balance: MemberBalance) {
		inspected = balance;
		drawer = 'balance';
	}
</script>

<BackHeader
	href={resolve('/')}
	backLabel="Groups"
	title={group.name}
	subtitle={group.description ?? undefined}
>
	{#snippet action()}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" aria-label="Group settings">
						<SettingsIcon class="size-5" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48 bg-surface">
				<DropdownMenu.Item onSelect={() => openFromMenu('settings')}>
					<SlidersHorizontalIcon class="size-4 text-subtle" />
					Group
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => openFromMenu('members')}>
					<UsersIcon class="size-4 text-subtle" />
					Members
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/snippet}
</BackHeader>

<Card title="Balances" footnote="Balances in a group always add up to zero." dividers={false}>
	<Row label="Spent in total" chevron={false} reserveChevron>
		{#snippet trailing()}
			<CurrencyText
				minor={totalMinor}
				currency={group.currency}
				class="text-[17px] font-semibold text-ink"
			/>
		{/snippet}
	</Row>

	{#each balances as balance (balance.memberId)}
		{@const member = group.members.find((candidate) => candidate.id === balance.memberId)}
		<Row label={member?.person.name ?? 'Unknown'} onclick={() => openBalance(balance)}>
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

<!--
	Settle-up suggestions are parked until that flow is designed. `simplifyDebts`
	stays in domain/ with its tests; this was the only place that rendered it.

<Card title="Settle up" footnote="Suggestions only — nothing is recorded until you confirm.">
	{#each simplifyDebts(balances) as transfer (transfer.fromMemberId + transfer.toMemberId)}
		<SettlementSuggestion
			{transfer}
			members={group.members}
			currency={group.currency}
			onrecord={() => (drawer = 'payment')}
		/>
	{/each}
</Card>
-->

<ExpenseList {expenses} members={group.members} currency={group.currency} onselect={openDetail} />

<div class="px-4 pb-6">
	<Button class="min-h-12 w-full" onclick={openExpense}>Add expense</Button>
</div>

<Drawer
	open={drawer === 'balance'}
	onclose={() => (drawer = null)}
	title={inspected?.person.name ?? 'Balance'}
	description="How this balance is made up."
>
	{#if ledger && inspected}
		<!--
			Every term of the formula, so the figure beside the member's name is
			arithmetic the user can follow rather than a number they must trust.
		-->
		<div class="card overflow-hidden rounded-card bg-surface">
			<Row label="Paid" sublabel="Expenses this member covered" chevron={false}>
				{#snippet trailing()}
					<CurrencyText
						minor={ledger.paidMinor}
						currency={group.currency}
						signed
						class="text-[17px] text-ink"
					/>
				{/snippet}
			</Row>

			<Row label="Share of expenses" sublabel="What they consumed" chevron={false}>
				{#snippet trailing()}
					<CurrencyText
						minor={-ledger.shareMinor}
						currency={group.currency}
						signed
						class="text-[17px] text-ink"
					/>
				{/snippet}
			</Row>

			{#if ledger.settlementsSentMinor > 0}
				<Row label="Payments sent" chevron={false}>
					{#snippet trailing()}
						<CurrencyText
							minor={ledger.settlementsSentMinor}
							currency={group.currency}
							signed
							class="text-[17px] text-ink"
						/>
					{/snippet}
				</Row>
			{/if}

			{#if ledger.settlementsReceivedMinor > 0}
				<Row label="Payments received" chevron={false}>
					{#snippet trailing()}
						<CurrencyText
							minor={-ledger.settlementsReceivedMinor}
							currency={group.currency}
							signed
							class="text-[17px] text-ink"
						/>
					{/snippet}
				</Row>
			{/if}

			<Row label="Balance" sublabel={describeBalance(inspected)} chevron={false}>
				{#snippet trailing()}
					<CurrencyText
						minor={ledger.balanceMinor}
						currency={group.currency}
						signed={ledger.balanceMinor !== 0}
						class="text-[17px] font-semibold text-ink"
					/>
				{/snippet}
			</Row>
		</div>
	{/if}
</Drawer>

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
				bind:value={draftPayerMemberId}
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
			<Row label={member.person.name} chevron={false}>
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
