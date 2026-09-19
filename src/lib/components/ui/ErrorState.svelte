<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		code,
		title,
		message,
		icon = 'info',
		retryLabel = 'Coba lagi',
		onRetry,
		loginHref,
		children
	}: {
		code?: string | number;
		title: string;
		message?: string;
		icon?: string;
		retryLabel?: string;
		onRetry?: () => void;
		loginHref?: string;
		children?: Snippet;
	} = $props();

	const hasActions = $derived(Boolean(onRetry || loginHref || children));
</script>

<div
	class="bg-card rounded-card shadow-rice border-rice border-line relative mx-auto w-full max-w-lg overflow-hidden px-6 py-8 text-center sm:px-8"
>
	{#if code !== undefined}
		<span
			class="text-faint pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 font-display text-[8rem] leading-none font-extrabold opacity-10 select-none"
			aria-hidden="true">{code}</span
		>
	{/if}

	<div class="relative">
		<span
			class="bg-subtle border-rice border-line mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
		>
			<Icon name={icon} class="text-accent h-7 w-7" />
		</span>

		{#if code !== undefined}
			<p class="text-accent mb-1 font-mono text-xs font-bold tracking-[0.25em] uppercase">
				Error {code}
			</p>
		{/if}
		<h1 class="text-ink font-display text-xl font-extrabold tracking-tight sm:text-2xl">
			{title}
		</h1>
		{#if message}
			<p class="text-muted mx-auto mt-2 max-w-sm text-sm">{message}</p>
		{/if}

		{#if hasActions}
			<div class="border-line border-rice mt-6 flex flex-wrap items-center justify-center gap-3 border-t pt-5">
				{#if onRetry}
					<button
						type="button"
						onclick={onRetry}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
					>
						{retryLabel}
					</button>
				{/if}
				{#if loginHref}
					<a
						href={loginHref}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
					>
						Masuk
					</a>
				{/if}
				{#if children}
					{@render children()}
				{/if}
			</div>
		{/if}
	</div>
</div>
