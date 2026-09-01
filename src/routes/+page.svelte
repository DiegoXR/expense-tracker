<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import CurrencyText from '$lib/components/CurrencyText.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FieldError from '$lib/components/FieldError.svelte';
	import MemberAvatar from '$lib/components/MemberAvatar.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import Row from '$lib/components/Row.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import TagIcon from '@lucide/svelte/icons/tag';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type DrawerName = 'group' | 'people' | 'categories' | 'settings';
	let drawer = $state<DrawerName | null>(null);

	/**
	 * Opens a drawer from the dropdown, one tick late: the menu restores focus to
	 * its trigger as it closes, and doing both in the same tick lets that restore
	 * pull focus straight back out of the sheet.
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

	{#if data.groups.length === 0}
		<EmptyState title="No groups yet" description="Create one to start splitting expenses." />
	{:else}
		{#each data.groups as entry (entry.group.id)}
			<Row
				label={entry.group.name}
				href={resolve('/groups/[groupId]', { groupId: entry.group.id })}
			>
				{#snippet trailing()}
					<CurrencyText
						minor={entry.totalMinor}
						currency={entry.group.currency}
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
	<form id="create-group" method="POST" action="?/createGroup" use:enhance>
		<div class="space-y-4 pb-2">
			<div>
				<label for="group-name" class="block text-[13px] font-medium text-subtle">Name</label>
				<input
					id="group-name"
					name="name"
					required
					class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
				/>
				<FieldError message={form?.field === 'name' ? form.message : undefined} />
			</div>

			<div>
				<label for="group-description" class="block text-[13px] font-medium text-subtle">
					Description
				</label>
				<input
					id="group-description"
					name="description"
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
					{#each data.currencies as currency (currency.code)}
						<option value={currency.code}>{currency.code}</option>
					{/each}
				</select>
				<FieldError message={form?.field === 'currencyCode' ? form.message : undefined} />
			</div>

			{#if data.people.length > 0}
				<fieldset>
					<legend class="text-[13px] font-medium text-subtle">Members</legend>
					<div class="card mt-1 overflow-hidden rounded-card bg-surface">
						{#each data.people as person (person.id)}
							<label data-row class="flex w-full items-stretch gap-3 ps-4">
								<span class="shrink-0 py-2.5"><MemberAvatar {person} /></span>
								<span
									data-row-body
									class="flex min-h-11 flex-1 items-center gap-3 py-2.5 pe-4 text-[17px] text-ink"
								>
									<span class="flex-1">{person.name}</span>
									<input type="checkbox" name="personId" value={person.id} class="size-5" />
								</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{/if}
		</div>
	</form>
	{#snippet footer()}
		<Button type="submit" form="create-group" class="min-h-12 w-full">Create group</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'people'}
	onclose={() => (drawer = null)}
	title="People"
	description="Everyone who can join a group."
>
	{#if data.people.length === 0}
		<EmptyState title="Nobody yet" description="Add the people you share expenses with." />
	{:else}
		<div class="card overflow-hidden rounded-card bg-surface">
			{#each data.people as person (person.id)}
				<Row label={person.name} chevron={false}>
					{#snippet leading()}
						<MemberAvatar {person} />
					{/snippet}
					{#snippet trailing()}
						<form method="POST" action="?/archivePerson" use:enhance>
							<input type="hidden" name="personId" value={person.id} />
							<button type="submit" class="min-h-11 px-2 text-[15px] text-subtle">Remove</button>
						</form>
					{/snippet}
				</Row>
			{/each}
		</div>
	{/if}

	<form id="create-person" method="POST" action="?/createPerson" use:enhance class="pt-4">
		<label for="person-name" class="block text-[13px] font-medium text-subtle">New person</label>
		<input
			id="person-name"
			name="name"
			required
			class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
		/>
		<FieldError message={form?.field === 'name' ? form.message : undefined} />
	</form>
	{#snippet footer()}
		<Button type="submit" form="create-person" class="min-h-12 w-full">Add person</Button>
	{/snippet}
</Drawer>

<Drawer
	open={drawer === 'categories'}
	onclose={() => (drawer = null)}
	title="Categories"
	description="Shared across every group, so reports can cross them."
>
	{#if data.categories.length === 0}
		<EmptyState title="No categories yet" description="Add one to start filing expenses." />
	{:else}
		<div class="card overflow-hidden rounded-card bg-surface">
			{#each data.categories as category (category.id)}
				<Row label={category.name} chevron={false}>
					{#snippet trailing()}
						<form method="POST" action="?/archiveCategory" use:enhance>
							<input type="hidden" name="categoryId" value={category.id} />
							<button type="submit" class="min-h-11 px-2 text-[15px] text-subtle">Remove</button>
						</form>
					{/snippet}
				</Row>
			{/each}
		</div>
	{/if}

	<form id="create-category" method="POST" action="?/createCategory" use:enhance class="pt-4">
		<label for="category-name" class="block text-[13px] font-medium text-subtle">New category</label
		>
		<input
			id="category-name"
			name="name"
			required
			class="mt-1 min-h-11 w-full rounded-md border border-chrome px-3 text-[17px] outline-none focus:border-ink"
		/>
		<FieldError message={form?.field === 'categoryName' ? form.message : undefined} />
	</form>
	{#snippet footer()}
		<Button type="submit" form="create-category" class="min-h-12 w-full">Add category</Button>
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
