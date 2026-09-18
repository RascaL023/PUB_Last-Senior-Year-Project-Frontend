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
</script>

<div class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-6 text-center">
	<Icon name={icon} class="text-muted mx-auto mb-3 h-10 w-10" />
	{#if code !== undefined}
		<p class="text-accent mb-1 font-mono text-xs font-bold tracking-[0.2em] uppercase">{code}</p>
	{/if}
	<p class="text-ink font-display text-lg font-extrabold">{title}</p>
	{#if message}
		<p class="text-muted mt-1 text-sm">{message}</p>
	{/if}
	<div class="mt-4 flex items-center justify-center gap-3">
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
</div>
