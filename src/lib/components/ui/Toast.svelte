<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const items = $derived(toastStore.items);

	function typeClass(type: string): string {
		switch (type) {
			case 'success':
				return 'bg-leaf text-inverted';
			case 'error':
				return 'bg-danger text-inverted';
			case 'warning':
				return 'bg-honey text-ink';
			default:
				return 'bg-sky text-inverted';
		}
	}

	function iconName(type: string): string {
		switch (type) {
			case 'success':
				return 'check';
			case 'error':
				return 'close';
			case 'warning':
				return 'info';
			default:
				return 'info';
		}
	}
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
	{#each items as toast (toast.id)}
		<div
			class="pointer-events-auto {typeClass(toast.type)} rounded-card shadow-ricelg border-rice border-line px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[400px] backdrop-blur-rice"
			in:fly={{ x: 500, opacity: 0, duration: 300 }}
			out:fly={{ x: 500, opacity: 0, duration: 300 }}
		>
			<Icon name={iconName(toast.type)} class="h-5 w-5 flex-none" />
				<p class="text-sm font-bold flex-1">{toast.message}</p>
				<button
					type="button"
					onclick={() => toastStore.dismiss(toast.id)}
					class="text-inverted/70 hover:text-inverted ml-2 flex-none"
				>
					<Icon name="close" class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>

