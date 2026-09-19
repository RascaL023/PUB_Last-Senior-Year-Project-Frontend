<script lang="ts">
	let {
		rows = 6,
		columns = 4,
		label = 'Memuat data…',
		class: className = ''
	}: {
		rows?: number;
		columns?: number;
		label?: string;
		class?: string;
	} = $props();

	const columnList = $derived(Array.from({ length: Math.max(1, columns) }));
	const rowList = $derived(Array.from({ length: Math.max(1, rows) }));
</script>

<div
	class="bg-shell border-line border-rice rounded-card overflow-hidden {className}"
	role="status"
	aria-live="polite"
>
	<div class="border-line border-rice flex items-center gap-4 border-b px-4 py-3">
		{#each columnList as _}
			<div class="skeleton-shimmer h-3 w-20 rounded-full"></div>
		{/each}
	</div>
	{#each rowList as _}
		<div class="flex items-center gap-4 px-4 py-4">
			{#each columnList as _}
				<div class="skeleton-shimmer h-4 w-full rounded-full"></div>
			{/each}
		</div>
	{/each}
	<p class="text-muted px-4 py-3 text-center text-sm font-bold">{label}</p>
</div>
