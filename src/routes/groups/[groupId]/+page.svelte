<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import BackHeader from '$lib/components/BackHeader.svelte';
	import BalanceBadge from '$lib/components/BalanceBadge.svelte';
	import Card from '$lib/components/Card.svelte';
	import CurrencyText from '$lib/components/CurrencyText.svelte';
	import DateField from '$lib/components/DateField.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import FieldError from '$lib/components/FieldError.svelte';
	import MemberAvatar from '$lib/components/MemberAvatar.svelte';
	import MoneyInput from '$lib/components/MoneyInput.svelte';
	import PercentageSplitEditor from '$lib/components/PercentageSplitEditor.svelte';
	import Row from '$lib/components/Row.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { computeMemberLedger, type MemberBalance } from '$lib/domain/balance';
	import type { ExpenseView } from '$lib/domain/types';
	import { describeBalance, describeExpense } from '$lib/domain/wording';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const group = $derived(data.group);
	const totalMinor = $derived(data.expenses.reduce((sum, expense) => sum + expense.totalMinor, 0));

	type DrawerName = 'expense' | 'detail' | 'balance' | 'payment' | 'members' | 'settings';
	let drawer = $state<DrawerName | null>(null);
	let inspected = $state<MemberBalance | null>(null);
	let selected = $state<ExpenseView | null>(null);

	/** The four terms behind the balance shown beside the member's name. */
	const ledger = $derived(
		inspected ? computeMemberLedger(inspected.memberId, data.expenses, data.settlements) : null
	);

	// Expense form state. It lives here, in the page: domain/ owns the
	// calculations, the component owns what is happening right now.
	let editingId = $state<string | null>(null);
	let draftTotalMinor = $state(0);
	let draftDate = $state('');
	let draftPayerMemberId = $state('');
	let draftShares = $state<Record<string, number>>({});

	function evenShares(): Record<string, number> {
		const each = Math.floor(100 / group.members.length);
		return Object.fromEntries(
			group.members.map((member, i) => [
				member.id,
				// Whole percentages never divide evenly by three, so the first row
				// absorbs the remainder and the editor opens already valid.
				i === 0 ? 100 - each * (group.members.length - 1) : each
			])
		);
	}

	function openNewExpense() {
		editingId = null;
		draftShares = evenShares();
		draftTotalMinor = 0;
		draftDate = new Date().toISOString().slice(0, 10);
		// The one job `people.is_self` has: the person keeping the ledger enters
		// most of the expenses, so start the payer on them.
		draftPayerMemberId =
			group.members.find((member) => member.person.isSelf)?.id ?? group.members[0]?.id ?? '';
		drawer = 'expense';
	}

	function openEditExpense(expense: ExpenseView) {
		editingId = expense.id;
		draftShares = Object.fromEntries(
			group.members.map((member) => [
				member.id,
				expense.splits.find((split) => split.memberId === member.id)?.sharePct ?? 0
			])
		);
		draftTotalMinor = expense.totalMinor;
		draftDate = expense.expenseDate;
		draftPayerMemberId = expense.payerMemberId;
		drawer = 'expense';
	}

	function openPayment() {
		draftDate = new Date().toISOString().slice(0, 10);
		drawer = 'payment';
	}

	/** See the overview page: let the menu close before the sheet takes focus. */
	function openFromMenu(name: DrawerName) {
		setTimeout(() => (drawer = name));
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

	{#if data.balances.length === 0}
		<EmptyState title="No members yet" description="Add someone to start splitting expenses." />
	{:else}
		{#each data.balances as balance (balance.memberId)}
			{@const member = group.members.find((candidate) => candidate.id === balance.memberId)}
			<Row
				label={member?.person.name ?? 'Unknown'}
				onclick={() => {
					inspected = balance;
					drawer = 'balance';
				}}
			>
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
	{/if}
</Card>

<ExpenseList
	expenses={data.expenses}
	members={group.members}
	currency={group.currency}
	onselect={(expense) => {
		selected = expense;
		drawer = 'detail';
	}}
/>

{#if data.settlements.length > 0}
	<Card title="Payments">
		{#each data.settlements as settlement (settlement.id)}
			{@const from = group.members.find((m) => m.id === settlement.fromMemberId)}
			{@const to = group.members.find((m) => m.id === settlement.toMemberId)}
			<Row
				label="{from?.person.name ?? 'Someone'} paid {to?.person.name ?? 'someone'}"
				sublabel={settlement.settledDate}
				chevron={false}
			>
				{#snippet trailing()}
					<div class="flex items-center gap-3">
						<CurrencyText
							minor={settlement.amountMinor}
							currency={group.currency}
							class="text-[17px] text-ink"
						/>
						<form method="POST" action="?/deleteSettlement" use:enhance>
							<input type="hidden" name="settlementId" value={settlement.id} />
							<button type="submit" class="min-h-11 px-1 text-[15px] text-subtle">Undo</button>
						</form>
					</div>
				{/snippet}
			</Row>
		{/each}
	</Card>
{/if}

<div class="space-y-3 px-4 pb-6">
	<Button class="min-h-12 w-full" onclick={openNewExpense} disabled={group.members.length === 0}>
		Add expense
	</Button>
	<Button
		variant="outline"
		class="min-h-12 w-full"
		onclick={openPayment}
		disabled={group.members.length < 2}
	>
		Record a payment
	</Button>
</div>

<Drawer
	open={drawer === 'expense'}
	onclose={() => (drawer = null)}
	title={editingId ? 'Edit expense' : 'New expense'}
	description="Who paid, how much, and how it splits."
>
	<form
		id="expense-form"
		method="POST"
		action={editingId ? '?/updateExpense' : '?/createExpense'}
		use:enhance
	>
		{#if editingId}
			<input type="hidden" name="expenseId" value={editingId} />
		{/if}

		<div class="space-y-5 pb-2">
			<div>
				<label for="expense-description" class="block text-[13px] font-medium text-subtle">
					Description
				</label>
				<input
					id="expense-description"
					name="description"
					value={editingId ? (selected?.description ?? '') : ''}
					required
					class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
				/>
				<FieldError message={form?.field === 'description' ? form.message : undefined} />
			</div>

			<MoneyInput
				bind:minor={draftTotalMinor}
				currency={group.currency}
				name="totalMinor"
				label="Amount"
			/>
			<FieldError message={form?.field === 'totalMinor' ? form.message : undefined} />

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
				<FieldError message={form?.field === 'payerMemberId' ? form.message : undefined} />
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
					<option value="">None</option>
					{#each data.categories as category (category.id)}
						<option value={category.id} selected={selected?.category?.id === category.id}>
							{category.name}
						</option>
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
			<FieldError message={form?.field === 'split' ? form.message : undefined} />
		</div>
	</form>
	{#snippet footer()}
		<Button type="submit" form="expense-form" class="min-h-12 w-full">
			{editingId ? 'Save changes' : 'Save expense'}
		</Button>
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

		<form method="POST" action="?/deleteExpense" use:enhance class="pt-4">
			<input type="hidden" name="expenseId" value={selected.id} />
			<Button type="submit" variant="outline" class="min-h-12 w-full">Delete expense</Button>
		</form>
	{/if}
	{#snippet footer()}
		<Button
			variant="outline"
			class="min-h-12 w-full"
			onclick={() => selected && openEditExpense(selected)}
		>
			Edit expense
		</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'payment'}
	onclose={() => (drawer = null)}
	title="Record a payment"
	description="A real transfer between two members, to clear a debt."
>
	<form id="payment-form" method="POST" action="?/recordSettlement" use:enhance>
		<div class="space-y-5 pb-2">
			<div>
				<label for="payment-from" class="block text-[13px] font-medium text-subtle">From</label>
				<select
					id="payment-from"
					name="fromMemberId"
					class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
				>
					{#each group.members as member (member.id)}
						<option value={member.id}>{member.person.name}</option>
					{/each}
				</select>
				<FieldError message={form?.field === 'fromMemberId' ? form.message : undefined} />
			</div>

			<div>
				<label for="payment-to" class="block text-[13px] font-medium text-subtle">To</label>
				<select
					id="payment-to"
					name="toMemberId"
					class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
				>
					{#each group.members as member (member.id)}
						<option value={member.id}>{member.person.name}</option>
					{/each}
				</select>
				<FieldError message={form?.field === 'toMemberId' ? form.message : undefined} />
			</div>

			<MoneyInput currency={group.currency} name="amountMinor" label="Amount" />
			<FieldError message={form?.field === 'amountMinor' ? form.message : undefined} />

			<DateField bind:value={draftDate} name="settledDate" label="Date" />
		</div>
	</form>
	{#snippet footer()}
		<Button type="submit" form="payment-form" class="min-h-12 w-full">Record payment</Button>
	{/snippet}
</Drawer>

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

<Drawer open={drawer === 'members'} onclose={() => (drawer = null)} title="Members">
	{#if group.members.length === 0}
		<EmptyState title="No members yet" description="Add someone from the list below." />
	{:else}
		<div class="card overflow-hidden rounded-card bg-surface">
			{#each group.members as member (member.id)}
				<Row label={member.person.name} chevron={false}>
					{#snippet leading()}
						<MemberAvatar person={member.person} />
					{/snippet}
					{#snippet trailing()}
						<form method="POST" action="?/removeMember" use:enhance>
							<input type="hidden" name="memberId" value={member.id} />
							<button type="submit" class="min-h-11 px-2 text-[15px] text-subtle">Remove</button>
						</form>
					{/snippet}
				</Row>
			{/each}
		</div>
	{/if}

	{#if data.candidates.length > 0}
		<form id="add-member" method="POST" action="?/addMember" use:enhance class="pt-4">
			<label for="member-person" class="block text-[13px] font-medium text-subtle">
				Add someone
			</label>
			<select
				id="member-person"
				name="personId"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			>
				{#each data.candidates as person (person.id)}
					<option value={person.id}>{person.name}</option>
				{/each}
			</select>
		</form>
	{:else}
		<p class="pt-4 text-[15px] text-subtle">
			Everyone is already in this group. Add more people from the overview.
		</p>
	{/if}

	{#snippet footer()}
		<Button
			type="submit"
			form="add-member"
			class="min-h-12 w-full"
			disabled={data.candidates.length === 0}
		>
			Add member
		</Button>
	{/snippet}
</Drawer>

<Drawer open={drawer === 'settings'} onclose={() => (drawer = null)} title="Group settings">
	<form id="update-group" method="POST" action="?/updateGroup" use:enhance class="space-y-4">
		<div>
			<label for="settings-name" class="block text-[13px] font-medium text-subtle">Name</label>
			<input
				id="settings-name"
				name="name"
				value={group.name}
				required
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			/>
			<FieldError message={form?.field === 'name' ? form.message : undefined} />
		</div>

		<div>
			<label for="settings-description" class="block text-[13px] font-medium text-subtle">
				Description
			</label>
			<input
				id="settings-description"
				name="description"
				value={group.description ?? ''}
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			/>
		</div>
	</form>

	<div class="card mt-5 overflow-hidden rounded-card bg-surface">
		<Row
			label="Currency"
			value={group.currency.code}
			sublabel="Fixed once the group exists"
			chevron={false}
		/>
	</div>

	<!--
		Archive is the default way out: it hides the group and keeps the history.
		Delete removes the expenses too, so it asks for the name in full.
	-->
	<form method="POST" action="?/archiveGroup" use:enhance class="pt-5">
		<Button type="submit" variant="outline" class="min-h-12 w-full">Archive group</Button>
	</form>

	<form method="POST" action="?/deleteGroup" use:enhance class="pt-5 pb-2">
		<label for="confirm-name" class="block text-[13px] font-medium text-subtle">
			Type “{group.name}” to delete this group and its expenses
		</label>
		<input
			id="confirm-name"
			name="confirmName"
			autocomplete="off"
			class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
		/>
		<FieldError message={form?.field === 'confirmName' ? form.message : undefined} />
		<Button type="submit" variant="outline" class="mt-3 min-h-12 w-full">Delete group</Button>
	</form>
</Drawer>

<style>
	.card :global([data-row]:not(:last-child) [data-row-body]) {
		border-bottom: 1px solid var(--color-chrome);
	}
</style>
