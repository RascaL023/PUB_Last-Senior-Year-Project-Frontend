<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page as routePage } from '$app/state';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { PaymentResponse, PaymentStatus, PaymentProvider } from '$lib/domain/payment';
	import type { InvoiceResponse } from '$lib/domain/invoice';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { goto } from '$app/navigation';

	const api = getApi();

	let payments = $state<PaymentResponse[]>([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);

	let keyword = $state('');
	let statusFilter = $state<PaymentStatus | ''>('');
	let providerFilter = $state<PaymentProvider | ''>('');
	let invoiceFilterId = $state<number | null>(null);

	let openInvoices = $state<InvoiceResponse[]>([]);
	let formInvoiceId = $state<number | null>(null);
	let formProvider = $state<PaymentProvider>('INTERNAL');
	let formAmount = $state<number | null>(null);
	let formDetail = $state('');
	let creating = $state(false);
	let createdUrl = $state<string | null>(null);

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let selected = $state<PaymentResponse | null>(null);
	let detailLoading = $state(false);

	let pollInterval: ReturnType<typeof setInterval> | null = null;

	const canRead = $derived(session.hasAuthority('payment.read') || session.hasAuthority('payment.*'));
	const canCreate = $derived(
		session.hasAuthority('payment.create') || session.hasAuthority('payment.*')
	);
	const canUpdate = $derived(
		session.hasAuthority('payment.update') || session.hasAuthority('payment.*')
	);
	const canReadInvoices = $derived(
		session.hasAuthority('invoice.read') || session.hasAuthority('invoice.*')
	);

	const selectedInvoice = $derived(
		openInvoices.find((invoice) => invoice.id === formInvoiceId) ?? null
	);
	const invoiceIdFromUrl = $derived(Number(routePage.url.searchParams.get('invoiceId')) || null);

	async function loadOpenInvoices() {
		if (!canReadInvoices) return;
		try {
			const [open, partial] = await Promise.all([
				api.invoices.list({ status: 'OPEN', size: 50, sort: 'createdAt,desc' }),
				api.invoices.list({ status: 'PARTIALLY_PAID', size: 50, sort: 'createdAt,desc' })
			]);
			openInvoices = [...open.items, ...partial.items];
		} catch {
			openInvoices = [];
		}
	}

	function statusColor(status: PaymentStatus): string {
		switch (status) {
			case 'PENDING':
				return 'bg-honey text-ink';
			case 'PAID':
				return 'bg-leaf text-inverted';
			case 'FAILED':
			case 'EXPIRED':
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

	function formatDateTime(date: string | null): string {
		if (!date) return '-';
		return new Date(date + '+07:00').toLocaleString('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function loadPayments(page = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result: PagedResult<PaymentResponse> = await api.payments.list({
					page,
					size: 20,
					keyword: keyword.trim() || undefined,
					invoiceId: invoiceFilterId ?? undefined,
					status: statusFilter || undefined,
					paymentProvider: providerFilter || undefined,
				sort: 'createdAt,desc'
			});
			payments = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!formInvoiceId || !canCreate) return;
		creating = true;
		createdUrl = null;
		try {
			const created = await api.payments.create({
				invoiceId: formInvoiceId,
				paymentProvider: formProvider,
				paymentDetail: formDetail.trim() || undefined,
				amount: formAmount ?? undefined
			});
			if (!created) throw new Error('Respons kosong dari server');
			toastStore.show(`Pembayaran #${created.id} dibuat (${created.status}).`, 'success');
			createdUrl = created.invoiceUrl;
			formInvoiceId = null;
			formAmount = null;
			formDetail = '';
			await loadPayments(0);
			await loadOpenInvoices();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			creating = false;
		}
	}

	async function handleTransition(payment: PaymentResponse, action: 'expire' | 'fail') {
		if (!canUpdate) return;
		if (!confirm(`${action === 'expire' ? 'Kedaluwarsakan' : 'Tandai gagal'} pembayaran #${payment.id}?`))
			return;
		try {
			await api.payments.transition(payment.id, action);
			toastStore.show(`Pembayaran #${payment.id} diperbarui.`, 'success');
			await loadPayments(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function openDetail(id: number) {
		detailLoading = true;
		try {
			selected = await api.payments.getById(id);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			detailLoading = false;
		}
	}

	function handleSearch() {
		void loadPayments(0);
	}

	function clearInvoiceFilter() {
		invoiceFilterId = null;
		formInvoiceId = null;
		void loadPayments(0);
	}

	function handlePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		void loadPayments(target - 1);
	}

	$effect(() => {
		if (invoiceIdFromUrl && invoiceIdFromUrl !== invoiceFilterId) {
			invoiceFilterId = invoiceIdFromUrl;
			formInvoiceId = invoiceIdFromUrl;
		}
		if (canRead) {
			void loadPayments(0);
			void loadOpenInvoices();
			if (!pollInterval) {
				pollInterval = setInterval(() => {
					if (payments.some((p) => p.status === 'PENDING')) void loadPayments(currentPage - 1);
				}, 10000);
			}
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>Pembayaran — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="wallet" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin untuk melihat pembayaran.</p>
			</div>
		{:else}
			<h2 class="font-display text-ink mb-4 text-2xl font-extrabold tracking-tight">Pembayaran</h2>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Pembayaran"
						message={error.message}
						onRetry={() => loadPayments(currentPage - 1)}
					/>
				</div>
			{/if}

			{#if canCreate}
				<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
					<h3 class="font-display text-ink mb-3 text-base font-bold">Buat Pembayaran</h3>
					<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Tagihan
							{#if canReadInvoices}
								<select
									bind:value={formInvoiceId}
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
								>
									<option value={null}>Pilih tagihan belum lunas...</option>
									{#each openInvoices as invoice (invoice.id)}
										<option value={invoice.id}>
											{invoice.invoiceNumber} · sisa {formatPrice(invoice.remainingAmount)}
										</option>
									{/each}
								</select>
							{:else}
								<input
									type="number"
									min="1"
									bind:value={formInvoiceId}
									placeholder="ID tagihan"
									class="bg-subtle text-ink border-line border-rice rounded-btn w-full px-3 py-2 text-sm sm:w-32"
								/>
							{/if}
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Metode
							<select
								bind:value={formProvider}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
							>
								<option value="INTERNAL">Tunai (INTERNAL)</option>
								<option value="XENDIT">Xendit</option>
							</select>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Nominal (kosong = lunas)
							<input
								type="number"
								min="1"
								bind:value={formAmount}
								placeholder={selectedInvoice
									? String(selectedInvoice.remainingAmount)
									: 'cth. 50000'}
								class="bg-subtle text-ink border-line border-rice rounded-btn w-full px-3 py-2 text-sm sm:w-40"
							/>
						</label>
						<label class="flex flex-1 flex-col gap-1 text-xs font-bold text-ink">
							Keterangan
							<input
								type="text"
								bind:value={formDetail}
								maxlength="255"
								placeholder="cth. BCA Virtual Account"
								class="bg-subtle text-ink border-line border-rice rounded-btn w-full px-3 py-2 text-sm"
							/>
						</label>
						<button
							type="button"
							disabled={!formInvoiceId || creating}
							onclick={handleCreate}
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
						>
							{creating ? 'Memproses...' : 'Buat'}
						</button>
					</div>
					{#if createdUrl}
						<div class="bg-subtle border-line border-rice rounded-btn mt-3 flex flex-wrap items-center gap-2 px-3 py-2">
							<p class="text-sm">
								<span class="text-muted font-bold">Link bayar: </span>
								<a href={createdUrl} target="_blank" rel="noopener" class="text-accent font-bold hover:underline">
									{createdUrl}
								</a>
							</p>
							<button
								type="button"
								onclick={() => (createdUrl = null)}
								class="text-muted hover:text-ink ml-auto text-xs font-bold"
							>
								Tutup
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4 sm:flex-row">
				<input
					type="text"
					placeholder="Cari invoice..."
					bind:value={keyword}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="bg-subtle text-ink border-line border-rice rounded-btn w-full flex-1 px-3 py-2 text-sm font-bold"
				/>
				<input
					type="number"
					min="1"
					placeholder="ID invoice"
					bind:value={invoiceFilterId}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold sm:w-32"
				/>
				<select
					bind:value={statusFilter}
					onchange={handleSearch}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Status</option>
					<option value="PENDING">Pending</option>
					<option value="PAID">Lunas</option>
					<option value="FAILED">Gagal</option>
					<option value="EXPIRED">Kedaluwarsa</option>
				</select>
				<select
					bind:value={providerFilter}
					onchange={handleSearch}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Metode</option>
					<option value="INTERNAL">Tunai</option>
					<option value="XENDIT">Xendit</option>
				</select>
				<button
					type="button"
					onclick={handleSearch}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
				>
					Cari
				</button>
				{#if invoiceFilterId}
					<button
						type="button"
						onclick={clearInvoiceFilter}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
					>
						Lepas invoice
					</button>
				{/if}
			</div>

			{#if loading}
				<div class="text-muted py-12 text-center">Memuat pembayaran...</div>
			{:else if payments.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="wallet" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada pembayaran</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Invoice</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Metode</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Nominal</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Status</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Dibayar</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each payments as payment (payment.id)}
								<tr class="border-line border-rice border-b">
									<td class="px-4 py-3">
										<button
											type="button"
											onclick={() => void openDetail(payment.id)}
											title="Lihat detail pembayaran (termasuk applied/excess amount)"
											class="text-ink font-mono font-bold hover:underline"
										>
											{payment.invoiceNumber}
										</button>
										<span class="text-faint ml-2 font-mono text-[0.65rem]">#{payment.invoiceId}</span>
									</td>
									<td class="text-muted px-4 py-3">{payment.paymentProvider}</td>
									<td class="text-ink px-4 py-3 font-mono">{formatPrice(payment.amount)}</td>
									<td class="px-4 py-3">
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(payment.status)}">
											{payment.status}
										</span>
									</td>
									<td class="text-muted px-4 py-3 font-mono text-xs">{formatDateTime(payment.paidAt)}</td>
									<td class="px-4 py-3 text-right">
										<div class="flex justify-end gap-2">
											{#if payment.invoiceUrl && payment.status === 'PENDING'}
												<a
													href={payment.invoiceUrl}
													target="_blank"
													rel="noopener"
													class="text-accent text-xs font-bold hover:underline"
												>
													Link bayar
												</a>
											{/if}
											{#if canUpdate && payment.status === 'PENDING'}
												<button
													type="button"
													onclick={() => handleTransition(payment, 'expire')}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
												>
													Kedaluwarsa
												</button>
												<button
													type="button"
													onclick={() => handleTransition(payment, 'fail')}
													class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
												>
													Gagal
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
		{/if}
	</div>
</section>

<Modal
	open={selected !== null}
	title={selected ? `Pembayaran #${selected.id} · ${selected.invoiceNumber}` : 'Detail Pembayaran'}
	subtitle="Settlement diteruskan ke invoice via event — order tidak punya status bayar."
	onClose={() => (selected = null)}
>
	{#if detailLoading || !selected}
		<p class="text-muted text-sm font-bold">Memuat detail...</p>
	{:else}
		<div class="mb-3 flex items-center gap-2">
			<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(selected.status)}">
				{selected.status}
			</span>
			<span class="text-muted font-mono text-xs">{selected.paymentProvider}</span>
		</div>
		<dl class="grid grid-cols-2 gap-2 text-sm">
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Nominal</dt>
				<dd class="text-ink font-mono font-bold">{formatPrice(selected.amount)}</dd>
			</div>
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Diterapkan ke tagihan</dt>
				<dd class="text-ink font-mono font-bold">{formatPrice(selected.appliedAmount)}</dd>
			</div>
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Kelebihan (excess)</dt>
				<dd class="text-ink font-mono font-bold">{formatPrice(selected.excessAmount)}</dd>
			</div>
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Dibayar pada</dt>
				<dd class="text-ink font-mono text-xs font-bold">{formatDateTime(selected.paidAt)}</dd>
			</div>
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Channel</dt>
				<dd class="text-ink font-mono text-xs">{selected.paymentChannel ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-muted font-mono text-xs font-bold">Metode</dt>
				<dd class="text-ink font-mono text-xs">{selected.paymentMethodName ?? selected.paymentDetail ?? '—'}</dd>
			</div>
			<div class="col-span-2">
				<dt class="text-muted font-mono text-xs font-bold">External ID</dt>
				<dd class="text-ink font-mono text-xs">{selected.externalId ?? '—'}</dd>
			</div>
		</dl>
		{#if selected.invoiceUrl && selected.status === 'PENDING'}
			<a
				href={selected.invoiceUrl}
				target="_blank"
				rel="noopener"
				class="bg-accent text-inverted rounded-btn rice-press mt-4 block px-4 py-2 text-center text-sm font-bold"
			>
				Buka link bayar Xendit
			</a>
		{/if}
		<div class="border-linemuted mt-4 flex justify-end gap-2 border-t pt-4">
			<button
				type="button"
				onclick={() => goto(`/invoices`)}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
			>
				Daftar tagihan
			</button>
			<button
				type="button"
				onclick={() => (selected = null)}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
			>
				Tutup
			</button>
		</div>
	{/if}
</Modal>
