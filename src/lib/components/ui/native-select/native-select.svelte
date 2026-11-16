<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { cn } from '$lib/utils.js';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	// Project change: `ref` typed directly. `WithElementRef` requires an
	// HTMLElement, and TypeScript's DOM types reject HTMLSelectElement as one
	// (its `remove(index)` overload clashes with Element's `remove()`).
	type NativeSelectProps = Omit<HTMLSelectAttributes, 'size'> & {
		ref?: HTMLSelectElement | null;
		size?: 'sm' | 'default';
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = 'default',
		children,
		...restProps
	}: NativeSelectProps = $props();
</script>

<div
	class={cn(
		// Project change: full width (was w-fit), so it fills its form column.
		'group/native-select relative w-full min-w-0 has-[select:disabled]:opacity-50',
		className
	)}
	data-slot="native-select-wrapper"
	data-size={size}
>
	<select
		bind:value
		bind:this={ref}
		data-slot="native-select"
		data-size={size}
		class="min-h-11 w-full min-w-0 appearance-none truncate rounded-md border border-input bg-surface py-1 pr-10 pl-3 text-[17px] text-ink transition-[color,box-shadow] outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus:border-ink focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:min-h-8 data-[size=sm]:text-sm dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon
		class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground select-none"
		aria-hidden
		data-slot="native-select-icon"
	/>
</div>
