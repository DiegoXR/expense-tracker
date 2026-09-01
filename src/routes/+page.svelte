<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import CurrencyText from '$lib/components/CurrencyText.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import MemberAvatar from '$lib/components/MemberAvatar.svelte';
	import MemberAvatarGroup from '$lib/components/MemberAvatarGroup.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Row from '$lib/components/Row.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { resolve } from '$app/paths';
	import { computeBalanceDeltas, mergeBalances } from '$lib/domain/balance';
	import {
		mockCategories,
		mockCurrencies,
		mockExpensesByGroup,
		mockGroups,
		mockPeople,
		mockSettlementsByGroup
	} from '$lib/domain/mock';
	import { describeBalance } from '$lib/domain/wording';
	import type { GroupView } from '$lib/domain/types';

	// Phase 1b: mock data only. Phase 2 replaces this with a load function and
	// the components below do not change — they already take everything as props.
	const groups = mockGroups;

	type GroupCard = {
		group: GroupView;
		totalMinor: number;
		selfBalanceMinor: number;
		selfCaption: string;
	};

	const cards: GroupCard[] = groups.map((group) => {
		const expenses = mockExpensesByGroup[group.id] ?? [];
		const balances = mergeBalances(
			group.members,
			computeBalanceDeltas(expenses, mockSettlementsByGroup[group.id] ?? [])
		);
		const self = balances.find((balance) => balance.person.isSelf);
		return {
			group,
			totalMinor: expenses.reduce((sum, expense) => sum + expense.totalMinor, 0),
			selfBalanceMinor: self?.balanceMinor ?? 0,
			selfCaption: self ? describeBalance(self) : 'Not a member'
		};
	});

	// Never summed across currencies: there are no exchange rates in this app.
	const totalsByCurrency = $derived.by(() => {
		const byCode: Record<string, number> = {};
		for (const card of cards) {
			const code = card.group.currency.code;
			byCode[code] = (byCode[code] ?? 0) + card.selfBalanceMinor;
		}
		return Object.entries(byCode).map(([code, minor]) => ({
			currency: Object.values(mockCurrencies).find((meta) => meta.code === code)!,
			minor
		}));
	});

	let drawer = $state<'group' | 'people' | 'categories' | 'settings' | null>(null);
</script>

<PageTitle title="Expenses">
	{#snippet action()}
		<Button size="sm" onclick={() => (drawer = 'group')}>New group</Button>
	{/snippet}
</PageTitle>

<Card title="Your balance">
	{#each totalsByCurrency as total (total.currency.code)}
		<Row label={total.currency.code}>
			{#snippet trailing()}
				<CurrencyText
					minor={total.minor}
					currency={total.currency}
					signed={total.minor !== 0}
					class="text-[17px] font-semibold text-ink"
				/>
			{/snippet}
		</Row>
	{/each}
</Card>

<Card title="Groups" footnote="Tap a group to see its expenses, balances and members.">
	{#if cards.length === 0}
		<EmptyState title="No groups yet" description="Create one to start splitting expenses." />
	{:else}
		{#each cards as card (card.group.id)}
			<Row
				label={card.group.name}
				sublabel="{card.selfCaption} · {card.group.members.length} members"
				href={resolve('/groups/[groupId]', { groupId: card.group.id })}
			>
				{#snippet leading()}
					<MemberAvatarGroup people={card.group.members.map((member) => member.person)} />
				{/snippet}
				{#snippet trailing()}
					<span class="flex flex-col items-end">
						<CurrencyText
							minor={card.selfBalanceMinor}
							currency={card.group.currency}
							signed={card.selfBalanceMinor !== 0}
							class="text-[17px] leading-tight text-ink"
						/>
						<CurrencyText
							minor={card.totalMinor}
							currency={card.group.currency}
							class="pt-0.5 text-[13px] leading-tight text-subtle"
						/>
					</span>
				{/snippet}
			</Row>
		{/each}
	{/if}
</Card>

<Card title="Global">
	<Row label="People" value={String(mockPeople.length)} onclick={() => (drawer = 'people')} />
	<Row
		label="Categories"
		value={String(mockCategories.length)}
		onclick={() => (drawer = 'categories')}
	/>
	<Row label="Settings" onclick={() => (drawer = 'settings')} />
</Card>

<Drawer
	open={drawer === 'group'}
	onclose={() => (drawer = null)}
	title="New group"
	description="A group is one shared ledger with one currency."
>
	<form class="space-y-4 pb-2">
		<div>
			<label for="group-name" class="block text-[13px] font-medium text-subtle">Name</label>
			<input
				id="group-name"
				name="name"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			/>
		</div>
		<div>
			<label for="group-currency" class="block text-[13px] font-medium text-subtle">
				Currency
			</label>
			<select
				id="group-currency"
				name="currencyCode"
				class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
			>
				{#each Object.values(mockCurrencies) as currency (currency.code)}
					<option value={currency.code}>{currency.code}</option>
				{/each}
			</select>
		</div>
	</form>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Create group</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'people'}
	onclose={() => (drawer = null)}
	title="People"
	description="Everyone who can join a group."
>
	<div class="card overflow-hidden rounded-card bg-surface">
		{#each mockPeople as person (person.id)}
			<Row label={person.name} value={person.isSelf ? 'You' : undefined} chevron={false}>
				{#snippet leading()}
					<MemberAvatar {person} />
				{/snippet}
			</Row>
		{/each}
	</div>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Add person</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'categories'}
	onclose={() => (drawer = null)}
	title="Categories"
	description="Shared across every group, so reports can cross them."
>
	<div class="card overflow-hidden rounded-card bg-surface">
		{#each mockCategories as category (category.id)}
			<Row label={category.name} chevron={false} />
		{/each}
	</div>
	{#snippet footer()}
		<Button class="min-h-12 w-full" disabled>Add category</Button>
	{/snippet}
</Drawer>

<Drawer open={drawer === 'settings'} onclose={() => (drawer = null)} title="Settings">
	<div class="card overflow-hidden rounded-card bg-surface">
		<Row label="Sign out" chevron={false} muted />
	</div>
</Drawer>

<style>
	.card :global([data-row]:not(:last-child) [data-row-body]) {
		border-bottom: 1px solid var(--color-chrome);
	}
</style>
