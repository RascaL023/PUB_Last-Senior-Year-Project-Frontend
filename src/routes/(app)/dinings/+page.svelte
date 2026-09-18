<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { DiningResponse, DiningListQuery } from '$lib/domain/dining';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let dinings = $state<DiningResponse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (session.status === 'ready') {
			void loadDinings();
		}
	});

	async function loadDinings() {
		loading = true;
		error = null;
		try {
			const query: DiningListQuery = { status: 'OPEN', size: 100 };
			const result = await api.dinings.list(query);
			dinings = result.items;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function closeDining(dining: DiningResponse) {
		if (!confirm(`Tutup sesi meja ${dining.tableNumber}?`)) return;
		try {
			await api.dinings.close(dining.id);
		} catch (e) {
			error = (e as Error).message;
		}
		await loadDinings();
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
	}

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Sesi Meja — Hysteria Cafe</title>
</svelte:head>

<div class="p-6 bg-app min-h-screen">
	<h2 class="font-display text-ink text-2xl font-extrabold mb-6">Sesi Meja Terbuka</h2>

	{#if error}
		<div class="mb-4">
			<ErrorState title="Gagal Memuat Sesi" message={error} onRetry={() => loadDinings()} />
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12 text-muted">Memuat...</div>
	{:else if dinings.length === 0}
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="table" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Tidak ada sesi terbuka.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each dinings as dining (dining.id)}
				<div class="bg-shell border-line border-rice rounded-card p-4 rice-lift">
					<div class="flex justify-between items-start mb-2">
						<div>
							<span class="font-mono text-ink font-bold">Meja {dining.tableNumber}</span>
							<span class="rounded-pill bg-sky text-inverted px-2 py-0.5 text-xs font-mono font-bold ml-2">
								{dining.status}
							</span>
						</div>
						<span class="text-ink font-display text-lg font-bold">
							{formatPrice(dining.totalPrice)}
						</span>
					</div>

					<p class="text-xs text-muted font-mono mb-2">
						Dibuka {formatDate(dining.createdAt)}
					</p>

					{#if dining.guestToken}
						<div class="flex items-center gap-2 mb-2">
							<span class="text-xs text-muted font-mono">Kode tamu:</span>
							<span class="text-xs font-mono text-ink font-bold">{dining.guestCode}</span>
						</div>
					{/if}

					<div class="flex justify-between items-center mt-2">
						<span class="text-xs text-muted">
							{dining.orders?.length ?? 0} order
						</span>

						{#if session.hasAuthority('dining.update') || session.hasAuthority('dining.*')}
							<button
								type="button"
								onclick={() => closeDining(dining)}
								class="bg-danger text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold"
							>
								Tutup
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
