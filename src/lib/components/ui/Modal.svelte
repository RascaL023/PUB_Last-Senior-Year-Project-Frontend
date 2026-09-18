<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		open = false,
		title,
		subtitle = undefined,
		onClose,
		size = 'md',
		children
	}: {
		open?: boolean;
		title: string;
		subtitle?: string;
		onClose: () => void;
		size?: 'sm' | 'md' | 'lg';
		children: import('svelte').Snippet;
	} = $props();

	const width: Record<'sm' | 'md' | 'lg', string> = {
		sm: 'sm:max-w-md',
		md: 'sm:max-w-2xl',
		lg: 'sm:max-w-4xl'
	};

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="bg-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<button
			type="button"
			aria-label="Tutup dialog"
			onclick={onClose}
			class="absolute inset-0 h-full w-full cursor-default"
		></button>
		<div
			class="bg-card border-line border-rice shadow-ricelg relative max-h-[92vh] w-full overflow-y-auto rounded-t-card sm:rounded-card {width[
				size
			]}"
		>
			<header class="border-line border-rice flex items-start justify-between gap-3 p-4">
				<div class="min-w-0">
					<h3 class="font-display text-ink text-lg font-bold">{title}</h3>
					{#if subtitle}
						<p class="text-muted mt-0.5 text-xs font-bold">{subtitle}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={onClose}
					aria-label="Tutup"
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press flex-none p-1.5"
				>
					<Icon name="close" class="h-4 w-4" />
				</button>
			</header>
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
