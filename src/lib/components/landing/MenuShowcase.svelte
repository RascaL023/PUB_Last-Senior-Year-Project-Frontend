<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { menuStore } from '$lib/stores';
	import { getFriendlyMessage, isAuthError } from '$lib/core/http/error-messages';
	import { motionDuration, reveal } from '$lib/actions/reveal';
	import MenuCard from './MenuCard.svelte';
	import CategoryFilter from './CategoryFilter.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let searchQuery = $state('');
	let searchTimeout: number | null = null;

	function handleSearch(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = window.setTimeout(() => {
			menuStore.search(value);
		}, 1500);
	}

	function handleFilter(categoryId: number | null) {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}
		menuStore.setCategory(categoryId);
	}

	function handleReset() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}
		searchQuery = '';
		menuStore.reset();
	}

	onMount(() => {
		menuStore.loadCategories();
		menuStore.loadMenus(0, 6);
	});
</script>

<section id="menu" class="landing-shell border-line bg-shell rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl scroll-mt-24 px-6 py-16">
	<div use:reveal class="mb-8">
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Menu</p>
		<h2 class="text-ink font-display mb-2 text-2xl font-extrabold">Menu Unggulan</h2>
		<p class="text-muted text-sm">Koleksi menu terbaik dari kopi dan makanan kami</p>
	</div>

	<div use:reveal={{ delay: 100 }} class="mb-4">
		<div class="relative">
			<Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
			<input
				type="search"
				bind:value={searchQuery}
				oninput={handleSearch}
				placeholder="Cari menu..."
				class="bg-subtle text-ink border-line border-rice rounded-btn pl-10 pr-4 py-2.5 text-sm font-bold w-full max-w-md outline-none focus:border-accent transition-colors"
			/>
		</div>
	</div>

	<div use:reveal={{ delay: 100 }}>
		<CategoryFilter onFilter={handleFilter} />
	</div>

	{#if menuStore.loading && menuStore.menus.length === 0}
		<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<div class="bg-card rounded-card shadow-rice border-rice border-line overflow-hidden p-4">
					<div class="skeleton-shimmer rounded-btn mb-4 h-48"></div>
					<div class="skeleton-shimmer rounded-btn mb-2 h-4 w-3/4"></div>
					<div class="skeleton-shimmer rounded-btn mb-3 h-4 w-1/2"></div>
					<div class="skeleton-shimmer rounded-btn h-6 w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else if menuStore.error}
		<div class="mt-8 text-center" in:fly={{ y: 16, duration: motionDuration(350) }}>
			<div class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-6">
				<p class="text-ink text-sm font-bold">Gagal memuat menu</p>
				<p class="text-muted mt-1 text-sm">{getFriendlyMessage(menuStore.error)}</p>
				<div class="mt-4 flex items-center justify-center gap-3">
					<button
						type="button"
						onclick={() => menuStore.retry()}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
					>
						Coba lagi
					</button>
					{#if isAuthError(menuStore.error)}
						<a
							href="/login"
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
						>
							Masuk
						</a>
					{/if}
				</div>
			</div>
		</div>
	{:else if menuStore.menus.length === 0}
		<div class="mt-8 text-center" in:fly={{ y: 16, duration: motionDuration(350) }}>
			<p class="text-muted text-sm">{searchQuery ? 'Tidak ada menu untuk "' + searchQuery + '"' : 'Menu tidak ditemukan untuk filter ini.'}</p>
			<button
				type="button"
				onclick={handleReset}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press mt-3 px-4 py-2 text-xs font-bold"
			>
				Tampilkan semua
			</button>
		</div>
	{:else}
		<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each menuStore.menus as menuItem, i (menuItem.id)}
				<div
					in:fly={{ y: 24, duration: motionDuration(350), delay: motionDuration(i * 60) }}
					out:fly={{ y: 12, duration: motionDuration(200) }}
					animate:flip={{ duration: motionDuration(300) }}
				>
					<MenuCard menu={menuItem} />
				</div>
			{/each}
		</div>
	{/if}
</section>
