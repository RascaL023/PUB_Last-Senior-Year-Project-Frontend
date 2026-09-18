<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { formatWibDate } from '$lib/core/time/wib';
	import type { DashboardSummary, DashboardSummaryQuery } from '$lib/domain/report';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(false);
	let error: string | null = $state(null);

	let fromDate = $state('');
	let toDate = $state('');

	const canRead = $derived(session.hasAuthority('report.read'));

	async function loadSummary() {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const query: DashboardSummaryQuery = {};
			if (fromDate) query.from = fromDate;
			if (toDate) query.to = toDate;
			summary = await api.report.getDashboardSummary(query);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.status === 'ready' && canRead) {
			void loadSummary();
		}
	});

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
	}

	function formatDate(date: string | null | undefined): string {
		return formatWibDate(date);
	}

	function refreshDateRange() {
		const today = new Date().toISOString().split('T')[0];
		fromDate = today;
		toDate = today;
		void loadSummary();
	}

	function clearDateRange() {
		fromDate = '';
		toDate = '';
		void loadSummary();
	}
</script>

<svelte:head>
	<title>Dashboard — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
	{#if !canRead}
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="dashboard" class="text-muted mx-auto mb-2 h-8 w-8" />
			<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
			<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat dashboard.</p>
		</div>
	{:else}
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Dashboard</h2>
		<button
			type="button"
			onclick={refreshDateRange}
			class="bg-accent text-inverted rounded-btn rice-press px-4 py-2 text-sm font-bold"
		>
			Hari Ini
		</button>
	</div>

	{#if error}
		<div class="mb-4">
			<ErrorState title="Gagal Memuat Dashboard" message={error} onRetry={() => loadSummary()} />
		</div>
	{/if}

	<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-wrap items-end gap-3 p-4">
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Dari tanggal
			<input
				type="date"
				bind:value={fromDate}
				onchange={loadSummary}
				class="bg-subtle text-ink rounded-btn border-line border-rice px-3 py-2 text-sm font-bold"
			/>
		</label>
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Sampai tanggal
			<input
				type="date"
				bind:value={toDate}
				onchange={loadSummary}
				class="bg-subtle text-ink rounded-btn border-line border-rice px-3 py-2 text-sm font-bold"
			/>
		</label>
		{#if fromDate || toDate}
			<button
				type="button"
				onclick={clearDateRange}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
			>
				Reset
			</button>
		{/if}
		<p class="text-faint ml-auto font-mono text-xs">Kosong = seluruh periode</p>
	</div>

	{#if loading}
		<div class="text-center py-12 text-muted">Memuat dashboard...</div>
	{:else if !summary}
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="dashboard" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Tidak dapat memuat data dashboard.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<div class="bg-shell border-line border-rice rounded-card p-6">
				<h3 class="font-display text-ink text-lg font-bold mb-4">Penjualan</h3>
				<div class="space-y-4">
					<div>
						<span class="text-muted font-mono text-xs font-bold">Tunai Diterima</span>
						<span class="block text-ink font-display text-2xl font-bold">{formatPrice(summary.sales.cash.received)}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Tagihan Terselesaikan</span>
						<span class="block text-ink font-bold">{summary.sales.billing.settledInvoices} invoice</span>
						<span class="block text-ink font-display text-xl font-bold">{formatPrice(summary.sales.billing.settledAmount)}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Rata-rata per Invoice</span>
						<span class="text-ink font-bold">{formatPrice(summary.sales.billing.averageSettledInvoice)}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Belum Lunas</span>
						<span class="block text-ink font-bold">{summary.sales.billing.outstandingInvoices} invoice</span>
						<span class="block text-ink font-display text-xl font-bold text-danger">{formatPrice(summary.sales.billing.outstandingAmount)}</span>
						<span class="text-muted text-xs">per {formatDate(summary.sales.billing.outstandingAsOf)}</span>
					</div>
				</div>
			</div>

			<div class="bg-shell border-line border-rice rounded-card p-6">
				<h3 class="font-display text-ink text-lg font-bold mb-4">Operasional</h3>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="text-muted font-mono text-xs font-bold">Sesi Terbuka</span>
						<span class="block text-ink font-display text-xl font-bold">{summary.operations.openDinings}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Meja Terpakai</span>
						<span class="block text-ink font-display text-xl font-bold">{summary.operations.occupiedTables}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Meja Tersedia</span>
						<span class="block text-ink font-display text-xl font-bold text-leaf">{summary.operations.availableTables}</span>
					</div>
					<div>
						<span class="text-muted font-mono text-xs font-bold">Order Aktif</span>
						<span class="block text-ink font-display text-xl font-bold">{summary.operations.ordersInProgress}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-shell border-line border-rice rounded-card p-6 mb-6">
			<h3 class="font-display text-ink text-lg font-bold mb-4">Menu Terlaris</h3>
			{#if summary.topMenus.length === 0}
				<p class="text-muted text-sm">Tidak ada data</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-b border-rice">
								<th class="text-left py-2 text-muted font-mono font-bold">Menu</th>
								<th class="text-right py-2 text-muted font-mono font-bold">Qty</th>
								<th class="text-right py-2 text-muted font-mono font-bold">Pendapatan</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.topMenus as menu (menu.menuId)}
								<tr class="border-line border-b border-rice">
									<td class="py-2 text-ink">{menu.name ?? '-'}</td>
									<td class="py-2 text-ink text-right font-mono">{menu.qty}</td>
									<td class="py-2 text-ink text-right font-mono">{formatPrice(menu.revenue)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<div class="bg-shell border-line border-rice rounded-card p-6">
			<h3 class="font-display text-ink text-lg font-bold mb-4">Aktivitas Terbaru</h3>
			{#if summary.recentActivity.length === 0}
				<p class="text-muted text-sm">Tidak ada aktivitas</p>
			{:else}
				<div class="space-y-3">
					{#each summary.recentActivity as activity (activity.orderId)}
						<div class="border-line border-rice flex items-center justify-between border-b py-2 last:border-b-0">
							<div>
								<span class="font-mono text-ink font-bold">{activity.orderNumber ?? '-'}</span>
								<span class="text-muted text-xs ml-2">{activity.status ?? '-'} / {activity.billingStatus ?? '-'}</span>
							</div>
							<div class="text-right">
								<span class="text-ink font-bold">{formatPrice(activity.orderTotalPrice)}</span>
								<span class="text-muted text-xs block">{formatDate(activity.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
	{/if}
	</div>
</section>
