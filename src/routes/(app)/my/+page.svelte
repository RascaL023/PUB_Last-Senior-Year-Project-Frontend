<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { MyDiningResponse } from '$lib/domain/dining';
	import type { OrderResponse } from '$lib/domain/order';
	import type { PagedResult } from '$lib/core/types/pagination';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import { goto } from '$app/navigation';

	const api = getApi();

	let dinings = $state<MyDiningResponse[]>([]);
	let orders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let ordersLoading = $state(false);
	let ordersError = $state<string | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	$effect(() => {
		if (session.status === 'ready' && session.isLoggedIn) {
			void loadMyDinings();
			void loadMyOrders();
		}
	});

	async function loadMyDinings() {
		try {
			dinings = (await api.dinings.myDinings()) ?? [];
		} catch (e) {
			if ((e as Error).message.includes('403')) {
				error = 'Silakan lengkapi profil member Anda terlebih dahulu.';
			} else {
				error = (e as Error).message;
			}
		}
	}

	async function loadMyOrders(page = 0) {
		ordersLoading = true;
		ordersError = null;
		try {
			const result: PagedResult<OrderResponse> = await api.orders.myOrders({ page, size: 10, sort: 'createdAt,desc' });
			orders = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			ordersError = (e as Error).message;
		} finally {
			ordersLoading = false;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
	}

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function statusLabel(status: string): string {
		const labels: Record<string, string> = {
			CREATED: 'Menunggu',
			CONFIRMED: 'Dikonfirmasi',
			PREPARING: 'Disiapkan',
			READY: 'Siap',
			COMPLETED: 'Selesai',
			CANCELLED: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'CREATED':
				return 'bg-honey text-ink';
			case 'CONFIRMED':
			case 'PREPARING':
				return 'bg-sky text-inverted';
			case 'READY':
				return 'bg-ember text-inverted';
			case 'COMPLETED':
				return 'bg-leaf text-inverted';
			case 'CANCELLED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}
</script>

<svelte:head>
	<title>Akun Saya — Hysteria Cafe</title>
</svelte:head>

<div class="p-6 bg-app min-h-screen">
	<h2 class="font-display text-ink text-2xl font-extrabold mb-6">Akun Saya</h2>

	{#if error}
		<div class="mb-4">
			<ErrorState code={403} title="Profil Member" message={error} />
		</div>
	{/if}

	<div class="mb-8">
		<h3 class="font-display text-ink text-lg font-bold mb-3">Sesi Aktif</h3>
		{#if error && error.includes('profil')}
			<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
				<Icon name="user" class="h-8 w-8 text-muted mx-auto mb-2" />
				<p class="text-muted text-sm font-bold mb-2">Profil member belum dilengkapi</p>
				<p class="text-muted text-xs">Silakan hubungi staf untuk mendaftarkan profil member Anda.</p>
			</div>
		{:else if dinings.length === 0}
			<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
				<Icon name="user" class="h-8 w-8 text-muted mx-auto mb-2" />
				<p class="text-muted text-sm font-bold">Belum ada sesi aktif.</p>
				<p class="text-faint text-xs mt-1">Pindai QR di meja untuk memulai.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each dinings as dining (dining.diningId)}
					<div class="bg-shell border-line border-rice rounded-card p-3 rice-lift">
						<div class="flex justify-between items-center">
							<div>
								<span class="font-mono text-ink font-bold">Meja {dining.tableNumber}</span>
								<span class="rounded-pill bg-leaf text-inverted px-2 py-0.5 text-xs font-mono font-bold ml-2">
									{dining.status}
								</span>
							</div>
							<button
								type="button"
								onclick={() => goto(`/my/dinings/${dining.guestToken}`)}
								class="text-accent font-bold text-sm rice-press"
							>
								Lanjut pesan
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div>
		<h3 class="font-display text-ink text-lg font-bold mb-3">Riwayat Pesanan</h3>
		{#if ordersError}
			<div class="mb-4">
				<ErrorState
					title="Gagal Memuat Riwayat"
					message={ordersError}
					onRetry={() => loadMyOrders(currentPage - 1)}
				/>
			</div>
		{:else if ordersLoading}
			<p class="text-muted text-sm">Memuat riwayat...</p>
		{:else if orders.length === 0}
			<p class="text-muted text-sm">Belum ada riwayat pesanan.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-line border-b border-rice">
							<th class="text-left py-2 text-muted font-mono font-bold">No. Order</th>
							<th class="text-left py-2 text-muted font-mono font-bold">Status</th>
							<th class="text-right py-2 text-muted font-mono font-bold">Total</th>
							<th class="text-right py-2 text-muted font-mono font-bold">Waktu</th>
						</tr>
					</thead>
					<tbody>
						{#each orders as order (order.id)}
							<tr class="border-line border-b border-rice">
								<td class="py-2 text-ink font-mono">{order.orderNumber}</td>
								<td class="py-2">
									<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(order.status)}">
										{statusLabel(order.status)}
									</span>
								</td>
								<td class="py-2 text-ink text-right font-mono">{formatPrice(order.totalPrice)}</td>
								<td class="py-2 text-muted text-right font-mono text-xs">{formatDate(order.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<div class="flex justify-between items-center mt-4 text-sm">
					<button
						type="button"
						onclick={() => loadMyOrders(currentPage - 2)}
						disabled={currentPage <= 1}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Sebelumnya
					</button>
					<span class="text-muted font-mono">Halaman {currentPage} dari {totalPages}</span>
					<button
						type="button"
						onclick={() => loadMyOrders(currentPage)}
						disabled={currentPage >= totalPages || !orders.length}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Berikutnya
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
