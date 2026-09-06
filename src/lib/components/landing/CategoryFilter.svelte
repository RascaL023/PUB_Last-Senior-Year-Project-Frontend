<script lang="ts">
	import { menuStore } from '$lib/stores';
	import type { MenuCategoryResponse } from '$lib/domain/menu-category';

	let { onFilter }: { onFilter: (categoryId: number | null) => void } = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		onclick={() => onFilter(null)}
		class="rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold
			{menuStore.selectedCategoryId === null
				? 'bg-accent text-inverted'
				: 'bg-subtle text-muted hover:text-ink'}"
	>
		Semua
	</button>
	{#each menuStore.categories as category (category.id)}
		<button
			type="button"
			onclick={() => onFilter(category.id)}
			class="rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold
				{menuStore.selectedCategoryId === category.id
					? 'bg-accent text-inverted'
					: 'bg-subtle text-muted hover:text-ink'}"
		>
			{category.name}
		</button>
	{/each}
</div>
