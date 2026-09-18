<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { InvoiceResponse, InvoiceStatus } from '$lib/domain/invoice';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let invoices = $state<InvoiceResponse[]>([]);
	let selected = $state<InvoiceResponse | null>(null);
	let loading = $state(false);
	let detailLoading = $state(false);
	let error: AppError | null = $state(null);

	let keyword = $state('');
	let statusFilter = $state<InvoiceStatus | ''>('');

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	const canRead = $derived(
		session.hasAuthority('invoice.read') || session.hasAuthority('invoice.*')
	);
	const canVoid = $derived(
		session.hasAuthority('invoice.update') || session.hasAuthority('invoice.*')
	);

	function statusColor(status: InvoiceStatus): string {
		switch (status) {
			case 'OPEN':
				return 'bg-honey text-ink';
			case 'PARTIALLY_PAID':
				return 'bg-sky text-inverted';
			case 'PAID':
				return 'bg-leaf text-inverted';
			case 'VOID':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	async function loadInvoices(page = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result: PagedResult<InvoiceResponse> = await api.invoices.list({
				page,
				size: 20,
				keyword: keyword.trim() || undefined,
				status: statusFilter || undefined,
				sort: 'createdAt,desc'
			});
			invoices = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function openDetail(id: number) {
		detailLoading = true;
		try {
			selected = await api.invoices.getById(id);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			detailLoading = false;
		}
	}

	async function handleVoid() {
		if (!selected || !canVoid) return;
		if (!confirm(`Void invoice ${selected.invoiceNumber}?`)) return;
		try {
			selected = await api.invoices.void(selected.id);
			toastStore.show(`Invoice ${selected.invoiceNumber} di-void.`, 'success');
			await loadInvoices(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function handleSearch() {
		selected = null;
		void loadInvoices(0);
	}

	function handlePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		selected = null;
		void loadInvoices(target - 1);
	}

	$effect(() => {
		if (canRead) void loadInvoices(0);
	});
</script>

<svelte:head>
	<title>Tagihan — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin untuk melihat tagihan.</p>
			</div>
		{:else}
			<h2 class="font-display text-ink mb-4 text-2xl font-extrabold tracking-tight">Tagihan</h2>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Tagihan"
						message={error.message}
						onRetry={() => loadInvoices(currentPage - 1)}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4 sm:flex-row">
				<input
					type="text"
					placeholder="Cari nomor invoice..."
					bind:value={keyword}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="bg-subtle text-ink border-line border-rice rounded-btn w-full flex-1 px-3 py-2 text-sm font-bold"
				/>
				<select
					bind:value={statusFilter}
					onchange={handleSearch}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Status</option>
					<option value="OPEN">Terbuka</option>
					<option value="PARTIALLY_PAID">Sebagian</option>
					<option value="PAID">Lunas</option>
					<option value="VOID">Void</option>
				</select>
			</div>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div>
					{#if loading}
						<div class="text-muted py-12 text-center">Memuat tagihan...</div>
					{:else if invoices.length === 0}
						<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
							<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
							<p class="text-muted text-sm font-bold">Belum ada tagihan</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each invoices as invoice (invoice.id)}
								<button
									type="button"
									onclick={() => openDetail(invoice.id)}
									class="bg-shell border-line border-rice rounded-card rice-lift w-full p-4 text-left
										{selected?.id === invoice.id ? 'border-accent' : ''}"
								>
									<div class="flex items-center justify-between gap-2">
										<span class="text-ink font-mono text-sm font-bold">{invoice.invoiceNumber}</span>
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(invoice.status)}">
											{invoice.status}
										</span>
									</div>
									<div class="mt-1 flex items-center justify-between">
										<span class="text-muted font-mono text-xs">
											Sisa: {formatPrice(invoice.remainingAmount)}
										</span>
										<span class="text-ink font-mono text-sm font-bold">{formatPrice(invoice.totalAmount)}</span>
									</div>
								</button>
							{/each}
						</div>

						<div class="mt-4 flex items-center justify-between text-sm">
							<button
								type="button"
								onclick={() => handlePage(-1)}
								disabled={currentPage <= 1}
								class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
							>
								Sebelumnya
							</button>
							<span class="text-muted font-mono text-xs">
								Halaman {currentPage} dari {totalPages} · {totalItems} data
							</span>
							<button
								type="button"
								onclick={() => handlePage(1)}
								disabled={currentPage >= totalPages}
								class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
							>
								Berikutnya
							</button>
						</div>
					{/if}
				</div>

				<div>
					{#if detailLoading}
						<div class="text-muted py-12 text-center">Memuat detail...</div>
					{:else if selected}
						<div class="bg-shell border-line border-rice rounded-card sticky top-4 p-4">
							<div class="mb-3 flex items-center justify-between gap-2">
								<h3 class="font-display text-ink text-lg font-bold">{selected.invoiceNumber}</h3>
								<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(selected.status)}">
									{selected.status}
								</span>
							</div>
							<dl class="mb-3 grid grid-cols-2 gap-2 text-sm">
								<div>
									<dt class="text-muted font-mono text-xs font-bold">Total</dt>
									<dd class="text-ink font-mono font-bold">{formatPrice(selected.totalAmount)}</dd>
								</div>
								<div>
									<dt class="text-muted font-mono text-xs font-bold">Terbayar</dt>
									<dd class="text-ink font-mono font-bold">{formatPrice(selected.paidAmount)}</dd>
								</div>
								<div>
									<dt class="text-muted font-mono text-xs font-bold">Sisa</dt>
									<dd class="text-ink font-mono font-bold">{formatPrice(selected.remainingAmount)}</dd>
								</div>
								<div>
									<dt class="text-muted font-mono text-xs font-bold">Sesi</dt>
									<dd class="text-ink font-mono font-bold">
										{selected.diningId ? `#${selected.diningId}` : 'Standalone'}
									</dd>
								</div>
							</dl>
							<div class="border-linemuted space-y-1.5 border-t pt-3 text-sm">
								{#each selected.items as item}
									<div class="text-ink flex justify-between">
										<span>{item.description} × {item.quantity}</span>
										<span class="font-mono">{formatPrice(item.amount)}</span>
									</div>
								{/each}
							</div>
							{#if canVoid && (selected.status === 'OPEN' || selected.status === 'PARTIALLY_PAID')}
								<button
									type="button"
									onclick={handleVoid}
									class="bg-danger text-inverted rounded-btn rice-press mt-4 w-full px-4 py-2 text-sm font-bold"
								>
									Void Invoice
								</button>
							{/if}
						</div>
					{:else}
						<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
							<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
							<p class="text-muted text-sm font-bold">Pilih tagihan untuk melihat detail.</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
