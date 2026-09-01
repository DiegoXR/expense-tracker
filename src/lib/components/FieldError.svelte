<script lang="ts">
	let { message, id }: { message?: string; id?: string } = $props();
</script>

{#if message}
	<p {id} class="pt-1 text-[13px] leading-snug font-medium text-ink" role="alert">
		{message}
	</p>
{/if}
