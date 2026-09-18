<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibTime } from '$lib/core/time/wib';
	import type { DiningTableResponse, TableListQuery } from '$lib/domain/table';
	import type { DiningResponse, DiningListQuery } from '$lib/domain/dining';
	import type { OrderResponse, OrderListQuery } from '$lib/domain/order';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let tables = $state<DiningTableResponse[]>([]);
	let openDinings = $state<DiningResponse[]>([]);
	let readyOrders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (session.status === 'ready') {
			void loadTables();
			void loadOpenDinings();
			void loadReadyOrders();
		}
	});

	async function loadTables() {
		try {
			const query: TableListQuery = { status: 'OCCUPIED', size: 100 };
			const result = await api.tables.list(query);
			tables = result.items;
		} catch (e) {
			error = toAppError(e).message;
		}
	}

	async function loadOpenDinings() {
		try {
			const query: DiningListQuery = { status: 'OPEN', size: 100 };
			const result = await api.dinings.list(query);
			openDinings = result.items;
		} catch (e) {
			error = toAppError(e).message;
		}
	}

	async function loadReadyOrders() {
		try {
			const query: OrderListQuery = { status: 'READY', sort: 'createdAt,asc', size: 50 };
			const result = await api.orders.list(query);
			readyOrders = result.items;
		} catch (e) {
			error = toAppError(e).message;
		}
	}

	function formatDate(date: string): string {
		return formatWibTime(date);
	}

	function findDiningByTable(tableId: number): DiningResponse | undefined {
		return openDinings.find((d) => d.tableId === tableId);
	}
</script>

<svelte:head>
	<title>Lantai — Hysteria Cafe</title>
</svelte:head>

<div class="p-6 bg-app min-h-screen">
	<h2 class="font-display text-ink text-2xl font-extrabold mb-6">Lantai Restoran</h2>

	{#if error}
		<div class="mb-4">
			<ErrorState
				title="Gagal Memuat Lantai"
				message={error}
				onRetry={() => {
					void loadTables();
					void loadOpenDinings();
					void loadReadyOrders();
				}}
			/>
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12 text-muted">Memuat...</div>
	{:else}
		<div class="mb-8">
			<h3 class="font-display text-ink text-lg font-bold mb-3">Meja</h3>
			{#if tables.length === 0}
				<p class="text-muted text-sm">Belum ada meja.</p>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
					{#each tables as table (table.id)}
						{@const dining = findDiningByTable(table.id)}
						<div class="bg-shell border-line border-rice rounded-card p-3 text-center rice-lift">
							<span class="font-mono text-ink font-bold text-lg block">Meja {table.tableNumber}</span>
							<span class="text-xs text-muted font-mono">
								{table.status === 'OCCUPIED' ? 'Terisi' : 'Kosong'}
							</span>
							{#if dining}
								<span class="text-xs text-sky font-bold block mt-1">Sesi Aktif</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="mb-8">
			<h3 class="font-display text-ink text-lg font-bold mb-3">Sesi Terbuka</h3>
			{#if openDinings.length === 0}
				<p class="text-muted text-sm">Tidak ada sesi terbuka.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-b border-rice">
								<th class="text-left py-2 text-muted font-mono font-bold">Meja</th>
								<th class="text-left py-2 text-muted font-mono font-bold">Status</th>
								<th class="text-right py-2 text-muted font-mono font-bold">Total</th>
								<th class="text-right py-2 text-muted font-mono font-bold">Order</th>
							</tr>
						</thead>
						<tbody>
							{#each openDinings as dining (dining.id)}
								<tr class="border-line border-b border-rice">
									<td class="py-2 text-ink font-bold">Meja {dining.tableNumber}</td>
									<td class="py-2">
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold bg-leaf text-inverted">
											{dining.status}
										</span>
									</td>
									<td class="py-2 text-ink text-right font-mono">
										{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(dining.totalPrice)}
									</td>
									<td class="py-2 text-right font-mono text-muted">
										{dining.orders?.length ?? 0} order
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<div>
			<h3 class="font-display text-ink text-lg font-bold mb-3">Siap Diantar</h3>
			{#if readyOrders.length === 0}
				<p class="text-muted text-sm">Tidak ada pesanan siap.</p>
			{:else}
				<div class="space-y-3">
					{#each readyOrders as order (order.id)}
						<div class="bg-shell border-line border-rice rounded-card p-3">
							<div class="flex justify-between items-center">
								<span class="font-mono text-ink font-bold">{order.orderNumber}</span>
								<span class="text-xs text-muted">
									{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
							<div class="flex justify-between items-center mt-1">
								<span class="text-ink">{order.totalPrice.toLocaleString('id-ID')}</span>
								{#if session.hasAuthority('order.mark.completed') || session.hasAuthority('order.*')}
									<button
										type="button"
										onclick={async () => {
											await api.orders.transition(order.id, 'complete');
											await loadReadyOrders();
										}}
										class="bg-leaf text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
									>
										Selesai
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
