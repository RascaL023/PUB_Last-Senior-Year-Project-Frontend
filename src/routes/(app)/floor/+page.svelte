<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibDateTime, formatWibTime } from '$lib/core/time/wib';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import type { AppError } from '$lib/core/http/http-errors';
	import type { DiningTableResponse } from '$lib/domain/table';
	import type { DiningResponse } from '$lib/domain/dining';
	import type { OrderResponse } from '$lib/domain/order';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let tables = $state<DiningTableResponse[]>([]);
	let openDinings = $state<DiningResponse[]>([]);
	let readyOrders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let busyId = $state<number | null>(null);
	let error: AppError | null = $state(null);

	const canReadTables = $derived(session.hasAuthority('table.read'));
	const canReadDinings = $derived(session.hasAuthority('dining.read'));
	const canReadOrders = $derived(session.hasAuthority('order.read'));
	const canComplete = $derived(
		session.hasAuthority('order.mark.completed') || session.hasAuthority('order.*')
	);

	async function loadTables() {
		if (!canReadTables) return;
		try {
			const result = await api.tables.list({ size: 100, sort: 'tableNumber,asc' });
			tables = result.items;
		} catch (e) {
			error = toAppError(e);
		}
	}

	async function loadOpenDinings() {
		if (!canReadDinings) return;
		try {
			const result = await api.dinings.list({ status: 'OPEN', size: 100, sort: 'createdAt,desc' });
			openDinings = result.items;
		} catch (e) {
			error = toAppError(e);
		}
	}

	async function loadReadyOrders() {
		if (!canReadOrders) return;
		try {
			const result = await api.orders.list({ status: 'READY', sort: 'createdAt,asc', size: 50 });
			readyOrders = result.items;
		} catch (e) {
			error = toAppError(e);
		}
	}

	async function reload() {
		loading = true;
		error = null;
		await Promise.all([loadTables(), loadOpenDinings(), loadReadyOrders()]);
		loading = false;
	}

	async function completeOrder(order: OrderResponse) {
		if (!canComplete || busyId === order.id) return;
		busyId = order.id;
		try {
			await api.orders.transition(order.id, 'complete');
			toastStore.show(`Order ${order.orderNumber} selesai.`, 'success');
			await loadReadyOrders();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			busyId = null;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	function sessionOf(tableId: number): DiningResponse | undefined {
		return openDinings.find((dining) => dining.tableId === tableId);
	}

	function occupiedLabel(table: DiningTableResponse): string {
		return table.status === 'OCCUPIED' ? 'Terisi' : 'Kosong';
	}

	$effect(() => {
		if (session.status === 'ready') void reload();
	});
</script>

<svelte:head>
	<title>Lantai — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Lantai Restoran</h2>
				<p class="text-muted mt-1 text-xs font-bold">
					{openDinings.length} sesi terbuka · {readyOrders.length} pesanan siap diantar
				</p>
			</div>
			<button
				type="button"
				onclick={reload}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
			>
				<Icon name="refresh" class="h-3.5 w-3.5" /> Muat ulang
			</button>
		</div>

		{#if error}
			<div class="mb-4">
				<ErrorState
					code={error.status}
					title="Gagal Memuat Lantai"
					message={error.message}
					onRetry={reload}
				/>
			</div>
		{/if}

		{#if loading && tables.length === 0 && openDinings.length === 0}
			<div class="text-muted py-12 text-center">Memuat denah lantai...</div>
		{:else}
			{#if canReadTables}
				<div class="mb-8">
					<h3 class="font-display text-ink mb-3 text-lg font-bold">Meja</h3>
					{#if tables.length === 0}
						<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
							<p class="text-muted text-sm font-bold">Belum ada meja terdaftar.</p>
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
							{#each tables as table (table.id)}
								{@const dining = sessionOf(table.id)}
								<button
									type="button"
									onclick={() => (dining ? goto('/dinings') : goto('/tables'))}
									class="bg-shell border-line border-rice rounded-card rice-lift p-3 text-center"
								>
									<span class="text-ink block font-mono text-lg font-bold">
										Meja {table.tableNumber}
									</span>
									<span class="rounded-pill border-rice border-line mt-1 inline-block px-2 py-0.5 font-mono text-xs font-bold
										{table.status === 'AVAILABLE' ? 'bg-leaf text-inverted' : 'bg-ember text-inverted'}">
										{occupiedLabel(table)}
									</span>
									{#if dining}
										<span class="text-accent mt-1 block text-xs font-bold">
											Sesi · {formatPrice(dining.totalPrice)}
										</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if canReadDinings}
				<div class="mb-8">
					<h3 class="font-display text-ink mb-3 text-lg font-bold">Sesi Terbuka</h3>
					{#if openDinings.length === 0}
						<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
							<p class="text-muted text-sm font-bold">Tidak ada sesi terbuka.</p>
						</div>
					{:else}
						<div class="bg-shell border-line border-rice rounded-card overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-line border-rice border-b">
										<th class="text-muted px-4 py-2 text-left font-mono font-bold">Meja</th>
										<th class="text-muted px-4 py-2 text-left font-mono font-bold">Dibuka</th>
										<th class="text-muted px-4 py-2 text-left font-mono font-bold">Pesanan</th>
										<th class="text-muted px-4 py-2 text-right font-mono font-bold">Total</th>
										<th class="text-muted px-4 py-2 text-right font-mono font-bold">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{#each openDinings as dining (dining.id)}
										<tr class="border-line border-rice border-b last:border-b-0">
											<td class="text-ink px-4 py-2 font-mono font-bold">Meja {dining.tableNumber}</td>
											<td class="text-muted px-4 py-2 font-mono text-xs">
												{formatWibDateTime(dining.createdAt)}
											</td>
											<td class="text-muted px-4 py-2 font-mono text-xs">
												{dining.orders?.length ?? 0} pesanan
											</td>
											<td class="text-ink px-4 py-2 text-right font-mono">
												{formatPrice(dining.totalPrice)}
											</td>
											<td class="px-4 py-2 text-right">
												<button
													type="button"
													onclick={() => goto('/dinings')}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2.5 py-1 text-xs font-bold"
												>
													Kelola
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}

			{#if canReadOrders}
				<div>
					<h3 class="font-display text-ink mb-3 text-lg font-bold">Siap Diantar</h3>
					{#if readyOrders.length === 0}
						<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
							<p class="text-muted text-sm font-bold">Tidak ada pesanan siap.</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each readyOrders as order (order.id)}
								<article class="bg-shell border-line border-rice rounded-card rice-lift p-3">
									<div class="flex items-center justify-between gap-2">
										<button
											type="button"
											onclick={() => goto(`/orders/${order.id}`)}
											class="text-ink font-mono text-sm font-bold hover:underline"
										>
											{order.orderNumber}
										</button>
										<span class="text-muted font-mono text-xs">{formatWibTime(order.createdAt)}</span>
									</div>
									<div class="mt-2 flex items-center justify-between gap-2">
										<span class="text-ink font-mono text-sm">{formatPrice(order.totalPrice)}</span>
										{#if canComplete}
											<button
												type="button"
												disabled={busyId === order.id}
												onclick={() => completeOrder(order)}
												class="bg-leaf text-inverted rounded-btn rice-press px-2.5 py-1 text-xs font-bold disabled:opacity-50"
											>
												Selesai
											</button>
										{/if}
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</section>
