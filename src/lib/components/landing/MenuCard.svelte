<script lang="ts">
	import type { MenuResponse } from '$lib/domain/menu';
	import { cart } from '$lib/stores';
	import MenuImage from './MenuImage.svelte';
	import ModifierPickerModal from '$lib/components/cart/ModifierPickerModal.svelte';

	let { menu }: { menu: MenuResponse } = $props();

	const cover = $derived(menu.imageUrls && menu.imageUrls.length > 0 ? menu.imageUrls[0] : null);
	const picking = $derived(cart.pickerMenu?.id === menu.id);
</script>

<article class="bg-card rounded-card shadow-rice border-rice border-line rice-lift h-full overflow-hidden">
	<MenuImage src={cover} alt={menu.name} />

	<div class="p-4">
		<div class="mb-2 flex items-start justify-between gap-2">
			<h3 class="text-ink text-base leading-tight font-bold">{menu.name}</h3>
			{#if menu.isAvailable}
				<span class="bg-leaf text-inverted rounded-pill border-rice border-line shadow-ricesm px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap">Tersedia</span>
			{:else}
				<span class="bg-danger text-inverted rounded-pill border-rice border-line shadow-ricesm px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap">Habis</span>
			{/if}
		</div>

		{#if menu.description}
			<p class="text-muted mb-3 line-clamp-2 text-sm">{menu.description}</p>
		{/if}

		<div class="flex items-center justify-between gap-2">
			<span class="text-ink font-mono text-lg font-extrabold">Rp {menu.basePrice.toLocaleString('id-ID')}</span>
			{#if menu.categories.length > 0}
				<span class="bg-subtle text-muted rounded-btn border-rice border-line truncate px-2 py-0.5 text-xs">
					{menu.categories.map((c) => c.name).join(', ')}
				</span>
			{/if}
		</div>

		<button
			type="button"
			onclick={() => cart.openPicker(menu)}
			disabled={!menu.isAvailable}
			class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-3 w-full px-4 py-2 text-xs font-bold disabled:opacity-40"
		>
			{menu.isAvailable ? '+ Keranjang' : 'Stok habis'}
		</button>
	</div>
</article>

{#if picking && cart.pickerMenu}
	<ModifierPickerModal menu={cart.pickerMenu} />
{/if}
