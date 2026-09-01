<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		confirmLabel = 'Confirm',
		onconfirm,
		trigger
	}: {
		title: string;
		description: string;
		confirmLabel?: string;
		onconfirm: () => void;
		trigger: Snippet;
	} = $props();

	let open = $state(false);
</script>

<button type="button" class="w-full text-start" onclick={() => (open = true)}>
	{@render trigger()}
</button>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="max-w-[380px] rounded-card bg-surface">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-ink">{title}</AlertDialog.Title>
			<AlertDialog.Description class="text-subtle">{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onconfirm}>{confirmLabel}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
