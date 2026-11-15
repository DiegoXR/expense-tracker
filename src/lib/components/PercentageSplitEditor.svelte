<script lang="ts">
	import { PERCENT_TOTAL } from '$lib/domain/money';
	import { buildSplits } from '$lib/domain/split';
	import type { CurrencyMeta, MemberSummary } from '$lib/domain/types';
	import CurrencyText from './CurrencyText.svelte';
	import MemberAvatar from './MemberAvatar.svelte';
	import PercentStepper from './PercentStepper.svelte';

	let {
		members,
		totalMinor,
		currency,
		shares = $bindable()
	}: {
		members: MemberSummary[];
		totalMinor: number;
		currency: CurrencyMeta;
		/** memberId -> whole percent. Owned by the parent form. */
		shares: Record<string, number>;
	} = $props();

	// Only explicit toggles are stored; everything else defaults from the shares
	// we were handed. A member added to the group later needs no re-seeding.
	let toggled = $state<Record<string, boolean>>({});
	const isOn = (memberId: string) => toggled[memberId] ?? (shares[memberId] ?? 0) > 0;

	const active = $derived(members.filter((member) => isOn(member.id)));
	const totalPct = $derived(active.reduce((sum, member) => sum + (shares[member.id] ?? 0), 0));
	const remainingPct = $derived(PERCENT_TOTAL - totalPct);
	const isValid = $derived(remainingPct === 0 && active.length > 0);

	// Live amounts from the exact function the server will run, so the number
	// shown before submitting is the number stored — odd unit included.
	const preview = $derived.by(() => {
		if (!isValid || totalMinor <= 0) return null;
		const rows = buildSplits(
			totalMinor,
			active.map((member) => ({ memberId: member.id, sharePct: shares[member.id] }))
		);
		return new Map(rows.map((row) => [row.memberId, row.shareMinor]));
	});

	function toggle(memberId: string) {
		const next = !isOn(memberId);
		toggled[memberId] = next;
		if (!next) shares[memberId] = 0;
	}

	/**
	 * With exactly two people in the split, the other share is never a choice:
	 * it is whatever is left, so one tap moves both (55/45). With three or more
	 * there is no obvious row to take from, so the remainder stays visible and
	 * "Give rest" settles it.
	 */
	function setShare(memberId: string, pct: number) {
		shares[memberId] = pct;
		if (active.length !== 2) return;
		const other = active.find((member) => member.id !== memberId);
		if (other) shares[other.id] = PERCENT_TOTAL - pct;
	}

	/** Hands whatever is unassigned (or over) to one member in a single tap. */
	function giveRemainder(memberId: string) {
		shares[memberId] = (shares[memberId] ?? 0) + remainingPct;
	}
</script>

<div>
	<div class="flex items-baseline justify-between px-1 pb-2">
		<span class="text-[13px] font-medium text-subtle">Split</span>
		<!--
			Beyond the two-person case (see setShare), no auto-normalising: spreading
			a change across several rows moves values the user did not touch, and an
			honest remainder is kinder than a helpful surprise.
		-->
		<span
			aria-live="polite"
			class="text-[13px] {isValid ? 'text-subtle' : 'font-semibold text-ink'}"
		>
			{#if isValid}
				Adds up to 100%
			{:else if remainingPct > 0}
				Remaining: {remainingPct}%
			{:else}
				{-remainingPct}% over
			{/if}
		</span>
	</div>

	<div class="card overflow-hidden rounded-card bg-surface">
		{#each members as member (member.id)}
			{@const on = isOn(member.id)}
			<div data-row class="flex items-stretch gap-3 ps-4">
				<span class="shrink-0 py-2.5">
					<MemberAvatar person={member.person} />
				</span>
				<div data-row-body class="flex min-h-11 flex-1 items-center gap-2 py-2 pe-4">
					<button
						type="button"
						onclick={() => toggle(member.id)}
						aria-pressed={on}
						class="min-w-0 flex-1 text-start"
					>
						<span class="block truncate text-[17px] {on ? 'text-ink' : 'text-subtle'}">
							{member.person.name}
						</span>
						{#if on && preview}
							<CurrencyText
								minor={preview.get(member.id) ?? 0}
								{currency}
								class="block pt-0.5 text-[15px] text-subtle"
							/>
						{:else if !on}
							<span class="block pt-0.5 text-[15px] text-subtle">Not included</span>
						{/if}
					</button>

					{#if on}
						{#if remainingPct !== 0}
							<button
								type="button"
								onclick={() => giveRemainder(member.id)}
								class="min-h-11 shrink-0 px-2 text-[13px] whitespace-nowrap text-subtle underline"
							>
								Give rest
							</button>
						{/if}
						<PercentStepper
							pct={shares[member.id] ?? 0}
							onchange={(pct) => setShare(member.id, pct)}
							label="{member.person.name}'s share"
							invalid={!isValid}
						/>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!--
		FormData preserves DOM order, so the server zips these two lists by index.
		It re-validates all of it and recomputes the amounts regardless.
	-->
	{#each active as member (member.id)}
		<input type="hidden" name="splitMemberId" value={member.id} />
		<input type="hidden" name="splitPct" value={shares[member.id] ?? 0} />
	{/each}
</div>

<style>
	.card :global([data-row]:not(:last-child) [data-row-body]) {
		border-bottom: 1px solid var(--color-chrome);
	}
</style>
