<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import type { Snippet } from 'svelte';

	// A route is a place; a drawer is a task. Every form in the app is one of
	// these — a bottom sheet, because the thumb is at the bottom of the phone.
	//
	// Controlled rather than bindable: pages track which drawer is open in a
	// single variable, so one-way `open` plus `onclose` is the honest shape.
	let {
		open,
		onclose,
		title,
		description,
		dismissible = true,
		children,
		footer
	}: {
		open: boolean;
		onclose: () => void;
		title: string;
		description?: string;
		/**
		 * False while a save is in flight: closing then would hide the outcome,
		 * and the page closes the sheet itself once the save lands.
		 */
		dismissible?: boolean;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<Sheet.Root {open} onOpenChange={(next) => !next && dismissible && onclose()}>
	<Sheet.Content
		side="bottom"
		showCloseButton={dismissible}
		interactOutsideBehavior={dismissible ? 'close' : 'ignore'}
		escapeKeydownBehavior={dismissible ? 'close' : 'ignore'}
		class="mx-auto max-h-[92dvh] max-w-[440px] gap-0 rounded-t-card border-chrome bg-surface p-0"
	>
		<Sheet.Header class="gap-1 px-4 pt-5 pb-3 text-start">
			<Sheet.Title class="text-[22px] font-bold text-ink">{title}</Sheet.Title>
			{#if description}
				<Sheet.Description class="text-[15px] text-subtle">{description}</Sheet.Description>
			{/if}
		</Sheet.Header>

		<div class="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
			{@render children()}
		</div>

		{#if footer}
			<!-- Primary actions sit in thumb reach, clear of the home indicator. -->
			<div class="border-t border-chrome px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
				{@render footer()}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
