<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import CurrencyText from '$lib/components/CurrencyText.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import MemberAvatar from '$lib/components/MemberAvatar.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Row from '$lib/components/Row.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import {
		mockCategories,
		mockCurrencies,
		mockExpensesByGroup,
		mockGroups,
		mockPeople
	} from '$lib/domain/mock';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import TagIcon from '@lucide/svelte/icons/tag';
	import UsersIcon from '@lucide/svelte/icons/users';

	// Phase 1b: mock data only. Phase 2 replaces this with a load function and
	// the components below do not change — they already take everything as props.
	//
	// This page is read-only for groups: it shows what each one has cost and
	// nothing else. Balances belong to a group, so they live on the group page.
	const cards = mockGroups.map((group) => ({
		group,
		totalMinor: (mockExpensesByGroup[group.id] ?? []).reduce(
			(sum, expense) => sum + expense.totalMinor,
			0
		)
	}));

	type DrawerName = 'group' | 'people' | 'categories' | 'settings';
	let drawer = $state<DrawerName | null>(null);

	/**
	 * Opens a drawer from the dropdown, one tick late.
	 *
	 * The menu restores focus to its trigger as it closes. Opening the sheet in
	 * the same tick means that restore lands *after* the sheet has taken focus
	 * and pulls it straight back out, leaving the sheet open but unfocused.
	 * Yielding once lets the menu finish first.
	 */
	function openFromMenu(name: DrawerName) {
		setTimeout(() => (drawer = name));
	}
</script>

<PageTitle title="Expenses">
	{#snippet action()}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" aria-label="Global settings">
						<SettingsIcon class="size-5" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48 bg-surface">
				<DropdownMenu.Item onSelect={() => openFromMenu('people')}>
					<UsersIcon class="size-4 text-subtle" />
					People
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => openFromMenu('categories')}>
					<TagIcon class="size-4 text-subtle" />
					Categories
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => openFromMenu('settings')}>
					<SlidersHorizontalIcon class="size-4 text-subtle" />
					Settings
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/snippet}
</PageTitle>

<Card title="Groups">
	{#snippet action()}
		<Button variant="ghost" size="sm" class="-me-2" onclick={() => (drawer = 'group')}>
			Create +
		</Button>
	{/snippet}

	{#if cards.length === 0}
		<EmptyState title="No groups yet" description="Create one to start splitting expenses." />
	{:else}
		{#each cards as card (card.group.id)}
			<Row label={card.group.name} href={resolve('/groups/[groupId]', { groupId: card.group.id })}>
				{#snippet trailing()}
					<CurrencyText
						minor={card.totalMinor}
						currency={card.group.currency}
						class="text-[17px] text-ink"
					/>
				{/snippet}
			</Row>
		{/each}
	{/if}
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
			<Row label={person.name} chevron={false}>
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
