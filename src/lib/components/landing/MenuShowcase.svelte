<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { getApi } from '$lib/infrastructure/api/index';
	import { getFriendlyMessage } from '$lib/core/http/error-messages';
	import type { AppError } from '$lib/core/http/http-errors';
	import type { MenuResponse } from '$lib/domain/menu';
	import { motionDuration, reveal } from '$lib/actions/reveal';
	import MenuCard from './MenuCard.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const api = getApi();

	const PAGE_SIZE = 6;
	const WINDOW_DAYS = 7;

	let menus = $state<MenuResponse[]>([]);
	let loading = $state(false);
	let error = $state<AppError | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(1);

	async function loadTopMenus(page = 0) {
		loading = true;
		error = null;
		try {
			const result = await api.menus.top(
				{ days: WINDOW_DAYS, page, size: PAGE_SIZE },
				{ auth: false }
			);
			menus = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
		} catch (e) {
			error = e as AppError;
		} finally {
			loading = false;
		}
	}

	function changePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		void loadTopMenus(target - 1);
	}

	onMount(() => void loadTopMenus(0));
</script>

<section
	id="menu"
	class="landing-shell border-line bg-shell rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl scroll-mt-24 px-6 py-16"
>
	<div use:reveal class="mb-8 flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">
				— Menu Unggulan
			</p>
			<h2 class="text-ink font-display mb-2 text-2xl font-extrabold">Terlaris Minggu Ini</h2>
			<p class="text-muted text-sm">
				Menu yang paling banyak dipesan tamu dalam {WINDOW_DAYS} hari terakhir.
			</p>
		</div>
		<a
			href="/menu"
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
		>
			Lihat semua menu →
		</a>
	</div>

	{#if loading && menus.length === 0}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(PAGE_SIZE) as _, i (i)}
				<div class="bg-card rounded-card shadow-rice border-rice border-line overflow-hidden p-4">
					<div class="skeleton-shimmer rounded-btn mb-4 h-48"></div>
					<div class="skeleton-shimmer rounded-btn mb-2 h-4 w-3/4"></div>
					<div class="skeleton-shimmer rounded-btn mb-3 h-4 w-1/2"></div>
					<div class="skeleton-shimmer rounded-btn h-6 w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div
			class="mt-2 text-center"
			in:fly={{ y: 16, duration: motionDuration(350) }}
		>
			<div class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-6">
				<p class="text-ink text-sm font-bold">Gagal memuat menu unggulan</p>
				<p class="text-muted mt-1 text-sm">{getFriendlyMessage(error)}</p>
				<button
					type="button"
					onclick={() => loadTopMenus(currentPage - 1)}
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-xs font-bold"
				>
					Coba lagi
				</button>
			</div>
		</div>
	{:else if menus.length === 0}
		<div
			class="bg-card rounded-card shadow-rice border-rice border-line mx-auto max-w-md p-8 text-center"
			in:fly={{ y: 16, duration: motionDuration(350) }}
		>
			<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
			<p class="text-muted text-sm font-bold">
				Belum ada penjualan minggu ini — menu lengkap tetap bisa dilihat.
			</p>
			<a
				href="/menu"
				class="bg-accent text-inverted rounded-btn border-line border-rice rice-press mt-4 inline-block px-4 py-2 text-xs font-bold"
			>
				Buka menu lengkap
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each menus as menuItem, i (menuItem.id)}
				<div
					in:fly={{ y: 24, duration: motionDuration(350), delay: motionDuration(i * 60) }}
					out:fly={{ y: 12, duration: motionDuration(200) }}
					animate:flip={{ duration: motionDuration(300) }}
				>
					<MenuCard menu={menuItem} />
				</div>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="mt-8 flex items-center justify-between gap-3">
				<button
					type="button"
					onclick={() => changePage(-1)}
					disabled={currentPage <= 1 || loading}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
				>
					← Sebelumnya
				</button>
				<span class="text-muted font-mono text-xs">
					Halaman {currentPage} dari {totalPages}
				</span>
				<button
					type="button"
					onclick={() => changePage(1)}
					disabled={currentPage >= totalPages || loading}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
				>
					Berikutnya →
				</button>
			</div>
		{/if}
	{/if}
</section>
