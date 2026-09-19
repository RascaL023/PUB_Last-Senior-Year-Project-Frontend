<script lang="ts">
	import { untrack } from 'svelte';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { formatWibDate } from '$lib/core/time/wib';
	import type { DashboardSummary, DashboardSummaryQuery } from '$lib/domain/report';
	import { orderStatusColor, orderStatusLabel } from '$lib/domain/order';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

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
			untrack(() => void loadSummary());
		}
	});

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
	}

	function formatDate(date: string | null | undefined): string {
		return formatWibDate(date);
	}

	const BILLING_LABELS: Record<string, string> = {
		OPEN: 'Belum lunas',
		PARTIALLY_PAID: 'Sebagian',
		PAID: 'Lunas',
		VOID: 'Void'
	};

	const BILLING_COLORS: Record<string, string> = {
		OPEN: 'bg-honey text-ink',
		PARTIALLY_PAID: 'bg-ember text-inverted',
		PAID: 'bg-leaf text-inverted',
		VOID: 'bg-danger text-inverted'
	};

	function billingLabel(status: string | null): string {
		return status ? (BILLING_LABELS[status] ?? status) : '—';
	}

	function billingColor(status: string | null): string {
		return status ? (BILLING_COLORS[status] ?? 'bg-subtle text-muted') : 'bg-subtle text-muted';
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

<section class="app-main bg-app text-ink px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
	<PageHeader title="Dashboard" subtitle="Ringkasan penjualan & operasional">
		<button
			type="button"
			onclick={refreshDateRange}
			class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold"
		>
			Hari Ini
		</button>
	</PageHeader>

	{#if session.status !== 'ready'}
		<LoadingState label="Menyiapkan dashboard…" />
	{:else if !canRead}
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="dashboard" class="text-muted mx-auto mb-2 h-8 w-8" />
			<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
			<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat dashboard.</p>
		</div>
	{:else}
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

	{#if loading && !summary}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each Array(2) as _}
				<div class="bg-shell border-line border-rice rounded-card p-6">
					<div class="skeleton-shimmer mb-4 h-5 w-32 rounded-pill"></div>
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="skeleton-shimmer h-4 w-full rounded-pill"></div>
						{/each}
						<div class="skeleton-shimmer h-8 w-2/3 rounded-btn"></div>
					</div>
				</div>
			{/each}
		</div>
		<p class="text-muted mt-6 text-center text-sm font-bold">Memuat dashboard…</p>
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

		<div class="bg-shell border-line border-rice rounded-card mb-6 overflow-hidden">
			<div class="border-line border-rice flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4">
				<h3 class="font-display text-ink text-lg font-bold">Menu Terlaris</h3>
				<span class="text-faint font-mono text-[0.65rem] tracking-[0.18em] uppercase">
					{summary.topMenus.length} menu
				</span>
			</div>
			{#if summary.topMenus.length === 0}
				<div class="px-6 py-10 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada penjualan pada periode ini.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th scope="col" class="text-muted px-6 py-3 text-left font-mono text-xs font-bold tracking-[0.12em] uppercase">#</th>
								<th scope="col" class="text-muted px-6 py-3 text-left font-mono text-xs font-bold tracking-[0.12em] uppercase">Menu</th>
								<th scope="col" class="text-muted px-6 py-3 text-right font-mono text-xs font-bold tracking-[0.12em] uppercase">Qty</th>
								<th scope="col" class="text-muted px-6 py-3 text-right font-mono text-xs font-bold tracking-[0.12em] uppercase">Pendapatan</th>
							</tr>
						</thead>
						<tbody>
							{#each summary.topMenus as menu, i (menu.menuId ?? i)}
								<tr class="border-line border-rice hover:bg-card-hover border-b last:border-b-0">
									<td class="text-faint px-6 py-3 font-mono text-xs tabular-nums">{i + 1}</td>
									<td class="text-ink px-6 py-3 font-bold">{menu.name ?? '—'}</td>
									<td class="text-ink px-6 py-3 text-right font-mono tabular-nums">{menu.qty}</td>
									<td class="text-ink px-6 py-3 text-right font-mono font-bold tabular-nums">{formatPrice(menu.revenue)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<div class="bg-shell border-line border-rice rounded-card overflow-hidden">
			<div class="border-line border-rice flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4">
				<h3 class="font-display text-ink text-lg font-bold">Aktivitas Terbaru</h3>
				<span class="text-faint font-mono text-[0.65rem] tracking-[0.18em] uppercase">
					{summary.recentActivity.length} entri
				</span>
			</div>
			{#if summary.recentActivity.length === 0}
				<div class="px-6 py-10 text-center">
					<Icon name="clock" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada aktivitas pada periode ini.</p>
				</div>
			{:else}
				{#each summary.recentActivity as activity (activity.orderId)}
					<div class="border-line border-rice flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 last:border-b-0">
						<div class="flex min-w-0 items-center gap-3">
							<span class="bg-subtle border-line border-rice rounded-pill flex h-9 w-9 flex-none items-center justify-center">
								<Icon name="receipt" class="text-muted h-4 w-4" />
							</span>
							<div class="min-w-0">
								<p class="text-ink truncate font-mono text-sm font-bold">{activity.orderNumber ?? '—'}</p>
								<div class="mt-1 flex flex-wrap items-center gap-1.5">
									<span class="rounded-pill border-rice border-line px-2 py-0.5 font-mono text-[0.65rem] font-bold {orderStatusColor(activity.status ?? '')}">
										{orderStatusLabel(activity.status ?? '—')}
									</span>
									<span class="rounded-pill border-rice border-line px-2 py-0.5 font-mono text-[0.65rem] font-bold {billingColor(activity.billingStatus)}">
										{billingLabel(activity.billingStatus)}
									</span>
								</div>
							</div>
						</div>
						<div class="text-right">
							<p class="text-ink font-mono font-bold tabular-nums">{formatPrice(activity.orderTotalPrice)}</p>
							<p class="text-muted font-mono text-[0.7rem]">{formatDate(activity.createdAt)}</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
	{/if}
	</div>
</section>
