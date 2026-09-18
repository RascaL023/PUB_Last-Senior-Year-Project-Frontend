<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { OrderResponse, OrderStatus } from '$lib/domain/order';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { goto } from '$app/navigation';

	const api = getApi();

	let orders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let error = $state<AppError | null>(null);

	let statusFilter = $state<OrderStatus | ''>('');
	let keyword = $state('');

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	const canRead = $derived(session.hasAuthority('order.read') || session.hasAuthority('order.*'));
	const canUpdate = $derived(session.hasAuthority('order.update') || session.hasAuthority('order.*'));

	function statusLabel(status: OrderStatus): string {
		const labels: Record<OrderStatus, string> = {
			CREATED: 'Menunggu',
			CONFIRMED: 'Dikonfirmasi',
			PREPARING: 'Disiapkan',
			READY: 'Siap',
			COMPLETED: 'Selesai',
			CANCELLED: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function statusColor(status: OrderStatus): string {
		switch (status) {
			case 'CREATED':
				return 'bg-honey text-ink';
			case 'CONFIRMED':
			case 'PREPARING':
				return 'bg-sky text-inverted';
			case 'READY':
			case 'COMPLETED':
				return 'bg-leaf text-inverted';
			case 'CANCELLED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}

	function transitionLabel(t: string): string {
		const labels: Record<string, string> = {
			confirm: 'Konfirmasi',
			prepare: 'Mulai',
			ready: 'Siapkan',
			complete: 'Selesai',
			cancel: 'Batal'
		};
		return labels[t] ?? t;
	}

	function canTransition(from: OrderStatus, to: OrderStatus): boolean {
		const allowed: Record<OrderStatus, OrderStatus[]> = {
			CREATED: ['CONFIRMED', 'CANCELLED'],
			CONFIRMED: ['PREPARING', 'CANCELLED'],
			PREPARING: ['READY'],
			READY: ['COMPLETED'],
			COMPLETED: [],
			CANCELLED: []
		};
		return allowed[from].includes(to);
	}

	function availableTransitions(status: OrderStatus): OrderStatus[] {
		const allowed: Record<OrderStatus, OrderStatus[]> = {
			CREATED: ['CONFIRMED', 'CANCELLED'],
			CONFIRMED: ['PREPARING', 'CANCELLED'],
			PREPARING: ['READY'],
			READY: ['COMPLETED'],
			COMPLETED: [],
			CANCELLED: []
		};
		return allowed[status];
	}

	function transitionAction(from: OrderStatus, to: OrderStatus): string {
		if (to === 'CONFIRMED') return 'confirm';
		if (to === 'CANCELLED') return 'cancel';
		if (to === 'PREPARING') return 'prepare';
		if (to === 'READY') return 'ready';
		if (to === 'COMPLETED') return 'complete';
		return '';
	}

	async function loadOrders(page = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result: PagedResult<OrderResponse> = await api.orders.list({
				page,
				size: 20,
				keyword: keyword || undefined,
				status: statusFilter || undefined,
				sort: 'createdAt,desc'
			});
			orders = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function handleTransition(order: OrderResponse, action: string): Promise<void> {
		if (!canUpdate) return;
		if (!confirm(`Yakin ingin ${transitionLabel(action)} order #${order.orderNumber}?`)) return;
		try {
			await api.orders.transition(order.id, action as any);
		} catch (e) {
			error = toAppError(e);
		}
		await loadOrders();
	}

	function handleSearch() {
		loadOrders(0);
	}

	function handlePageChange(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		loadOrders(target - 1);
	}

	$effect(() => {
		if (canRead) {
			loadOrders(0);
		}
	});
</script>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
				<h2 class="font-display text-ink text-xl font-extrabold mb-2">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin untuk melihat daftar order.</p>
			</div>
		{:else}
			<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight mb-4">Daftar Order</h2>

			{#if error}
				<div class="bg-danger/10 border border-danger rounded-card px-4 py-3 text-sm text-ink mb-4">
					{error.message}
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card p-4 mb-4 flex flex-col sm:flex-row gap-3">
				<div class="flex-1">
					<input
						type="text"
						placeholder="Cari order..."
						bind:value={keyword}
						oninput={() => {}}
						onkeydown={(e) => e.key === 'Enter' && handleSearch()}
						class="w-full bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
					/>
				</div>
				<select
					bind:value={statusFilter}
					onchange={handleSearch}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Status</option>
					<option value="CREATED">Menunggu</option>
					<option value="CONFIRMED">Dikonfirmasi</option>
					<option value="PREPARING">Disiapkan</option>
					<option value="READY">Siap</option>
					<option value="COMPLETED">Selesai</option>
					<option value="CANCELLED">Dibatalkan</option>
				</select>
			</div>

			{#if loading}
				<div class="text-center py-12 text-muted">Memuat order...</div>
			{:else if orders.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
					<p class="text-muted text-sm font-bold">Belum ada order</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-b border-rice">
								<th class="text-left py-3 px-4 text-muted font-mono font-bold">No. Order</th>
								<th class="text-left py-3 px-4 text-muted font-mono font-bold">Tipe</th>
								<th class="text-left py-3 px-4 text-muted font-mono font-bold">Status</th>
								<th class="text-left py-3 px-4 text-muted font-mono font-bold">Total</th>
								<th class="text-left py-3 px-4 text-muted font-mono font-bold">Dibuat</th>
								<th class="text-right py-3 px-4 text-muted font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each orders as order}
								<tr class="border-line border-b border-rice rice-lift">
									<td class="py-3 px-4 font-mono font-bold text-ink">{order.orderNumber}</td>
									<td class="py-3 px-4 text-muted">{order.type === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}</td>
									<td class="py-3 px-4">
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(order.status)}">
											{statusLabel(order.status)}
										</span>
									</td>
									<td class="py-3 px-4 font-mono text-ink">{order.totalPrice.toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-muted font-mono text-xs">{new Date(order.createdAt).toLocaleString('id-ID')}</td>
									<td class="py-3 px-4 text-right">
										<button
											type="button"
											onclick={() => goto(`/orders/${order.id}`)}
											class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold mr-2"
										>
											Detail
										</button>
										{#if canUpdate}
											{#each availableTransitions(order.status) as targetStatus}
												{@const action = transitionAction(order.status, targetStatus)}
												<button
													type="button"
													onclick={() => handleTransition(order, action)}
													class="text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold ml-1 {targetStatus === 'CANCELLED' ? 'bg-danger' : targetStatus === 'COMPLETED' ? 'bg-leaf' : 'bg-accent'}"
												>
													{transitionLabel(action)}
												</button>
											{/each}
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if totalPages > 1}
				<div class="flex justify-between items-center mt-4 text-sm">
					<button
						type="button"
						onclick={() => handlePageChange(-1)}
						disabled={currentPage <= 1 || loading}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Sebelumnya
					</button>
					<span class="text-muted font-mono">Halaman {currentPage} dari {totalPages} ({totalItems} order)</span>
					<button
						type="button"
						onclick={() => handlePageChange(1)}
						disabled={currentPage >= totalPages || loading}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Berikutnya
					</button>
				</div>
			{/if}
		{/if}
	</div>
</section>
