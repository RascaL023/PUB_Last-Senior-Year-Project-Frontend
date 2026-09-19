<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import SiteHeader from '$lib/components/landing/SiteHeader.svelte';
	import FooterSection from '$lib/components/landing/FooterSection.svelte';
	import MenuCard from '$lib/components/landing/MenuCard.svelte';
	import CategoryFilter from '$lib/components/landing/CategoryFilter.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { menuStore } from '$lib/stores';
	import { getFriendlyMessage } from '$lib/core/http/error-messages';

	const PAGE_SIZE = 12;

	let searchQuery = $state('');
	let searchTimeout: number | null = null;

	function clearSearchTimeout() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}
	}

	function handleSearch(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		clearSearchTimeout();
		searchTimeout = window.setTimeout(() => void menuStore.search(value), 400);
	}

	function handleFilter(categoryId: number | null) {
		clearSearchTimeout();
		menuStore.setCategory(categoryId);
	}

	function handleReset() {
		clearSearchTimeout();
		searchQuery = '';
		menuStore.reset();
	}

	function changePage(delta: number) {
		const target = menuStore.pagination.currentPage + delta;
		if (target < 1 || target > menuStore.pagination.totalPages) return;
		void menuStore.loadMenus(target - 1, PAGE_SIZE);
	}

	onMount(() => {
		void menuStore.loadCategories();
		void menuStore.loadMenus(0, PAGE_SIZE);
	});
</script>

<svelte:head>
	<title>Menu — Hysteria Cafe</title>
	<meta
		name="description"
		content="Jelajahi seluruh menu kopi, makanan, dan minuman Hysteria Cafe lengkap dengan harga."
	/>
</svelte:head>

<SiteHeader />

<main id="top" class="font-theme bg-app text-ink min-h-screen px-3 pb-6 sm:px-6">
	<section class="landing-shell border-line bg-shell rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl px-6 py-10">
		<div class="mb-6">
			<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">
				— Katalog
			</p>
			<h1 class="text-ink font-display text-3xl font-extrabold tracking-tight">Menu Kami</h1>
			<p class="text-muted mt-2 text-sm">
				{menuStore.pagination.totalItems > 0
					? `${menuStore.pagination.totalItems} menu tersedia`
					: 'Semua menu yang bisa kamu pesan hari ini.'}
			</p>
		</div>

		<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="relative w-full sm:max-w-sm">
				<Icon
					name="search"
					class="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
				/>
				<input
					type="search"
					bind:value={searchQuery}
					oninput={handleSearch}
					placeholder="Cari menu…"
					class="bg-subtle text-ink border-line border-rice rounded-btn w-full py-2.5 pr-4 pl-10 text-sm font-bold outline-none placeholder:text-faint focus:border-accent"
				/>
			</div>
			{#if menuStore.keyword || menuStore.selectedCategoryId !== null}
				<button
					type="button"
					onclick={handleReset}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold sm:ml-auto"
				>
					Reset filter
				</button>
			{/if}
		</div>

		<CategoryFilter onFilter={handleFilter} />
	</section>

	<section class="mx-auto mt-6 max-w-7xl">
		{#if menuStore.loading && menuStore.menus.length === 0}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each Array(8) as _, i (i)}
					<div class="bg-card rounded-card shadow-rice border-rice border-line overflow-hidden p-4">
						<div class="skeleton-shimmer rounded-btn mb-4 h-40"></div>
						<div class="skeleton-shimmer rounded-btn mb-2 h-4 w-3/4"></div>
						<div class="skeleton-shimmer rounded-btn mb-3 h-4 w-1/2"></div>
						<div class="skeleton-shimmer rounded-btn h-6 w-1/3"></div>
					</div>
				{/each}
			</div>
		{:else if menuStore.error}
			<div class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-8 text-center">
				<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
				<p class="text-ink text-sm font-bold">Gagal memuat menu</p>
				<p class="text-muted mt-1 text-sm">{getFriendlyMessage(menuStore.error)}</p>
				<button
					type="button"
					onclick={() => menuStore.retry()}
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-xs font-bold"
				>
					Coba lagi
				</button>
			</div>
		{:else if menuStore.menus.length === 0}
			<div class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-8 text-center">
				<Icon name="search" class="text-muted mx-auto mb-2 h-8 w-8" />
				<p class="text-muted text-sm font-bold">
					{menuStore.keyword
						? `Tidak ada menu untuk "${menuStore.keyword}"`
						: 'Menu tidak ditemukan untuk filter ini.'}
				</p>
				<button
					type="button"
					onclick={handleReset}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-xs font-bold"
				>
					Tampilkan semua
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each menuStore.menus as menuItem, i (menuItem.id)}
					<div
						in:fly={{ y: 20, duration: 260, delay: Math.min(i * 40, 240) }}
						out:fly={{ y: 12, duration: 180 }}
						animate:flip={{ duration: 260 }}
					>
						<MenuCard menu={menuItem} />
					</div>
				{/each}
			</div>

			{#if menuStore.pagination.totalPages > 1}
				<div class="mt-8 flex items-center justify-between gap-3">
					<button
						type="button"
						onclick={() => changePage(-1)}
						disabled={menuStore.pagination.currentPage <= 1 || menuStore.loading}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
					>
						← Sebelumnya
					</button>
					<span class="text-muted font-mono text-xs">
						Halaman {menuStore.pagination.currentPage} dari {menuStore.pagination.totalPages} ·
						{menuStore.pagination.totalItems} menu
					</span>
					<button
						type="button"
						onclick={() => changePage(1)}
						disabled={menuStore.pagination.currentPage >= menuStore.pagination.totalPages || menuStore.loading}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
					>
						Berikutnya →
					</button>
				</div>
			{/if}
		{/if}
	</section>
</main>

<FooterSection />
