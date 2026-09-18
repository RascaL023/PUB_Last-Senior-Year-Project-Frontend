<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as routePage } from '$app/state';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { InvoiceItemRequest, InvoiceResponse, InvoiceStatus } from '$lib/domain/invoice';
	import type { OrderResponse } from '$lib/domain/order';
	import { formatWibDateTime } from '$lib/core/time/wib';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	const api = getApi();

	let invoices = $state<InvoiceResponse[]>([]);
	let selected = $state<InvoiceResponse | null>(null);
	let loading = $state(false);
	let detailLoading = $state(false);
	let error: AppError | null = $state(null);

	let keyword = $state('');
	let statusFilter = $state<InvoiceStatus | ''>('');
	let orderFilterId = $state<number | null>(null);
	let diningFilterId = $state<number | null>(null);

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let showCreate = $state(false);
	let orderKeyword = $state('');
	let orderResults = $state<OrderResponse[]>([]);
	let searchingOrders = $state(false);
	let pickedOrder = $state<OrderResponse | null>(null);
	let creating = $state(false);

	const canRead = $derived(
		session.hasAuthority('invoice.read') || session.hasAuthority('invoice.*')
	);
	const canVoid = $derived(
		session.hasAuthority('invoice.update') || session.hasAuthority('invoice.*')
	);
	const canDelete = $derived(
		session.hasAuthority('invoice.delete') || session.hasAuthority('invoice.*')
	);
	const canCreate = $derived(
		session.hasAuthority('invoice.create') || session.hasAuthority('invoice.*')
	);
	const canReadOrders = $derived(
		session.hasAuthority('order.read') || session.hasAuthority('order.*')
	);
	const orderIdFromUrl = $derived(Number(routePage.url.searchParams.get('orderId')) || null);
	const diningIdFromUrl = $derived(Number(routePage.url.searchParams.get('diningId')) || null);

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

	function normalizeInvoiceStatus(value: string): InvoiceStatus | undefined {
		const v = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
		switch (v) {
			case 'OPEN':
				return 'OPEN';
			case 'PARTIALLY_PAID':
			case 'PARTIALLYPAID':
			case 'PARTIAL':
			case 'PARTIALLY':
				return 'PARTIALLY_PAID';
			case 'PAID':
			case 'SETTLED':
				return 'PAID';
			case 'VOID':
			case 'VOIDED':
			case 'CANCELLED':
			case 'CANCEL':
				return 'VOID';
			case '':
				return undefined;
			default:
				return statusFilter || undefined;
		}
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
					status: normalizeInvoiceStatus(statusFilter),
					orderId: orderFilterId ?? undefined,
					diningId: diningFilterId ?? undefined,
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

	async function searchOrders() {
		pickedOrder = null;
		searchingOrders = true;
		try {
			const result = await api.orders.list({
				keyword: orderKeyword.trim() || undefined,
				size: 10,
				sort: 'createdAt,desc'
			});
			orderResults = result.items;
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			searchingOrders = false;
		}
	}

	async function createInvoiceFromOrder() {
		if (!pickedOrder || creating) return;
		if (pickedOrder.items.length === 0) {
			toastStore.show('Pesanan ini tidak punya item untuk ditagihkan.', 'warning');
			return;
		}
		creating = true;
		try {
			const items: InvoiceItemRequest[] = pickedOrder.items.map((item) => ({
				orderItemId: item.id,
				orderId: pickedOrder!.id,
				menuId: item.menuId,
				description: item.itemName,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				amount: item.subtotal
			}));
			const created = await api.invoices.create({
				customerId: pickedOrder.customerId ?? undefined,
				customerName: pickedOrder.customerName ?? undefined,
				items
			});
			toastStore.show(`Tagihan ${created.invoiceNumber} dibuat.`, 'success');
			showCreate = false;
			pickedOrder = null;
			orderResults = [];
			orderKeyword = '';
			await loadInvoices(0);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			creating = false;
		}
	}

	async function handleDelete() {
		if (!selected || !canDelete) return;
		if (!confirm(`Hapus invoice ${selected.invoiceNumber}? Hanya invoice tanpa pembayaran yang bisa dihapus.`)) return;
		try {
			await api.invoices.remove(selected.id);
			toastStore.show(`Invoice ${selected.invoiceNumber} dihapus.`, 'success');
			selected = null;
			await loadInvoices(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function handleSearch() {
		selected = null;
		void loadInvoices(0);
	}

	function clearContextFilters() {
		orderFilterId = null;
		diningFilterId = null;
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
		if (orderIdFromUrl && orderIdFromUrl !== orderFilterId) orderFilterId = orderIdFromUrl;
		if (diningIdFromUrl && diningIdFromUrl !== diningFilterId) diningFilterId = diningIdFromUrl;
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
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Tagihan</h2>
					<p class="text-muted mt-1 text-xs font-bold">{totalItems} tagihan</p>
				</div>
				{#if canCreate && canReadOrders}
					<button
						type="button"
						onclick={() => (showCreate = true)}
						class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold"
					>
						+ Tagihan Manual
					</button>
				{/if}
			</div>

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
				<input
					type="number"
					min="1"
					placeholder="Order ID"
					bind:value={orderFilterId}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold sm:w-28"
				/>
				<input
					type="number"
					min="1"
					placeholder="Sesi ID"
					bind:value={diningFilterId}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold sm:w-28"
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
				<button
					type="button"
					onclick={handleSearch}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
				>
					Cari
				</button>
				{#if orderFilterId || diningFilterId}
					<button
						type="button"
						onclick={clearContextFilters}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
					>
						Lepas konteks
					</button>
				{/if}
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
									aria-pressed={selected?.id === invoice.id}
									class="border-rice rounded-card rice-lift w-full p-4 text-left {selected?.id === invoice.id
										? 'bg-card border-accent'
										: 'bg-shell border-line'}"
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
									<span class="text-faint mt-1 block font-mono text-[0.65rem]">
										{formatWibDateTime(invoice.createdAt)}
										{invoice.diningId ? ` · sesi #${invoice.diningId}` : ''}
									</span>
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
								<div class="col-span-2">
									<dt class="text-muted font-mono text-xs font-bold">Pelanggan</dt>
									<dd class="text-ink font-mono text-xs font-bold">
										{selected.customerName ?? '—'}{selected.customerId ? ` (#${selected.customerId})` : ''}
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
									onclick={() => goto(`/payments?invoiceId=${selected?.id}`)}
									class="bg-accent text-inverted rounded-btn rice-press mt-4 w-full px-4 py-2 text-sm font-bold"
								>
									Buat / lihat pembayaran
								</button>
								<button
									type="button"
									onclick={handleVoid}
									class="bg-danger text-inverted rounded-btn rice-press mt-2 w-full px-4 py-2 text-sm font-bold"
								>
									Void Invoice
								</button>
							{:else if selected.status === 'PAID' || selected.status === 'VOID'}
								<button
									type="button"
									onclick={() => goto(`/payments?invoiceId=${selected?.id}`)}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press mt-4 w-full px-4 py-2 text-sm font-bold"
								>
									Lihat pembayaran
								</button>
							{/if}
							{#if canDelete && (selected.status === 'OPEN' || selected.status === 'VOID')}
								<button
									type="button"
									title="Hapus permanen (BE: invoice.delete). Invoice dengan pembayaran ditolak server."
									onclick={handleDelete}
									class="bg-subtle text-danger hover:text-danger rounded-btn border-rice border-line rice-press mt-2 w-full px-4 py-2 text-sm font-bold"
								>
									Hapus Invoice
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

<Modal
	open={showCreate}
	title="Tagihan Manual dari Pesanan"
	subtitle="Tagihan biasanya dibuat otomatis saat pesanan masuk — pakai form ini hanya bila tagihan belum ada."
	onClose={() => (showCreate = false)}
>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
		<label class="flex flex-1 flex-col gap-1 text-xs font-bold text-ink">
			Cari pesanan (nomor order / pelanggan)
			<input
				type="text"
				bind:value={orderKeyword}
				placeholder="cth. ORD-20260918-0001"
				onkeydown={(e) => e.key === 'Enter' && searchOrders()}
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
			/>
		</label>
		<button
			type="button"
			disabled={searchingOrders}
			onclick={searchOrders}
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
		>
			{searchingOrders ? 'Mencari...' : 'Cari'}
		</button>
	</div>

	{#if orderResults.length > 0}
		<div class="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
			{#each orderResults as order (order.id)}
				<button
					type="button"
					onclick={() => (pickedOrder = order)}
					aria-pressed={pickedOrder?.id === order.id}
					class="border-rice rounded-btn rice-press flex flex-wrap items-center gap-2 px-3 py-2 text-left text-sm {pickedOrder?.id === order.id
						? 'bg-card border-accent'
						: 'bg-subtle border-line'}"
				>
					<span class="text-ink font-mono font-bold">{order.orderNumber}</span>
					<span class="text-muted text-xs">{order.customerName ?? 'Tanpa nama'}</span>
					<span class="text-muted ml-auto font-mono text-xs">
						{formatPrice(order.totalPrice)}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if pickedOrder}
		<div class="border-linemuted mt-4 border-t pt-3">
			<p class="text-ink mb-2 text-sm font-bold">Item yang akan ditagihkan</p>
			<div class="space-y-1 text-sm">
				{#each pickedOrder.items as item (item.id)}
					<div class="text-ink flex justify-between">
						<span>{item.itemName} × {item.quantity}</span>
						<span class="font-mono">{formatPrice(item.subtotal)}</span>
					</div>
				{/each}
			</div>
			<div class="border-line border-rice mt-2 flex justify-between border-t pt-2 text-sm font-bold">
				<span class="text-ink">Total</span>
				<span class="text-ink font-mono">{formatPrice(pickedOrder.totalPrice)}</span>
			</div>
		</div>
	{/if}

	<div class="border-linemuted mt-4 flex justify-end gap-2 border-t pt-4">
		<button
			type="button"
			onclick={() => (showCreate = false)}
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
		>
			Batal
		</button>
		<button
			type="button"
			disabled={!pickedOrder || creating}
			onclick={createInvoiceFromOrder}
			class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
		>
			{creating ? 'Membuat...' : 'Buat Tagihan'}
		</button>
	</div>
</Modal>
