<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibDateTime } from '$lib/core/time/wib';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import type { AppError } from '$lib/core/http/http-errors';
	import type { DiningResponse } from '$lib/domain/dining';
	import type { DiningTableResponse } from '$lib/domain/table';
	import type { InvoiceResponse } from '$lib/domain/invoice';
	import type { MenuResponse } from '$lib/domain/menu';
	import type { OrderStatus, OrderTransition } from '$lib/domain/order';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import MenuPicker, {
		emptyLine,
		missingRequiredModifiers,
		toOrderItems,
		type MenuPickerLine
	} from '$lib/components/order/MenuPicker.svelte';

	const api = getApi();

	const ORDER_FLOW: { action: OrderTransition; label: string; from: OrderStatus[]; authority: string }[] = [
		{ action: 'confirm', label: 'Konfirmasi', from: ['CREATED'], authority: 'order.update' },
		{ action: 'prepare', label: 'Mulai', from: ['CONFIRMED'], authority: 'order.mark.preparing' },
		{ action: 'ready', label: 'Siap', from: ['PREPARING'], authority: 'order.mark.ready' },
		{ action: 'complete', label: 'Selesai', from: ['READY'], authority: 'order.mark.completed' }
	];

	let dinings = $state<DiningResponse[]>([]);
	let tables = $state<DiningTableResponse[]>([]);
	let invoicesByDining = $state<Record<number, InvoiceResponse>>({});
	let menus = $state<MenuResponse[]>([]);

	let loading = $state(false);
	let busyId = $state<number | null>(null);
	let error: AppError | null = $state(null);

	let expandedId = $state<number | null>(null);

	let showOpen = $state(false);
	let selectedTableId = $state<number | null>(null);
	let opening = $state(false);

	let orderDining = $state<DiningResponse | null>(null);
	let orderLines = $state<MenuPickerLine[]>([emptyLine()]);
	let orderCustomer = $state('');
	let orderNotes = $state('');
	let submittingOrder = $state(false);

	const canRead = $derived(session.hasAuthority('dining.read'));
	const canCreate = $derived(session.hasAuthority('dining.create'));
	const canUpdate = $derived(session.hasAuthority('dining.update'));
	const canReadTables = $derived(session.hasAuthority('table.read'));
	const canReadMenu = $derived(session.hasAuthority('menu.read'));
	const canReadInvoices = $derived(session.hasAuthority('invoice.read'));
	const canReadPayments = $derived(session.hasAuthority('payment.read'));

	function orderStatusLabel(status: string): string {
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

	function orderStatusColor(status: string): string {
		switch (status) {
			case 'CREATED':
				return 'bg-honey text-ink';
			case 'CONFIRMED':
				return 'bg-sky text-inverted';
			case 'PREPARING':
				return 'bg-ember text-inverted';
			case 'READY':
				return 'bg-grape text-inverted';
			case 'COMPLETED':
				return 'bg-leaf text-inverted';
			case 'CANCELLED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}

	function invoiceColor(status: string): string {
		switch (status) {
			case 'PAID':
				return 'bg-leaf text-inverted';
			case 'PARTIALLY_PAID':
				return 'bg-sky text-inverted';
			case 'VOID':
				return 'bg-danger text-inverted';
			default:
				return 'bg-honey text-ink';
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	function guestUrl(dining: DiningResponse): string {
		const origin = typeof window === 'undefined' ? '' : window.location.origin;
		return `${origin}/guest/${dining.guestToken}`;
	}

	async function loadDinings() {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result = await api.dinings.list({ status: 'OPEN', size: 100, sort: 'createdAt,desc' });
			dinings = result.items;
			await loadInvoices();
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function loadTables() {
		if (!canReadTables) return;
		try {
			const result = await api.tables.list({ status: 'AVAILABLE', size: 100, sort: 'tableNumber,asc' });
			tables = result.items;
		} catch {
			tables = [];
		}
	}

	async function loadInvoices() {
		if (!canReadInvoices) return;
		try {
			const result = await api.invoices.list({ size: 100, sort: 'createdAt,desc' });
			const map: Record<number, InvoiceResponse> = {};
			for (const invoice of result.items) {
				if (invoice.diningId && !map[invoice.diningId]) map[invoice.diningId] = invoice;
			}
			invoicesByDining = map;
		} catch {
			invoicesByDining = {};
		}
	}

	async function loadMenus() {
		if (!canReadMenu || menus.length > 0) return;
		try {
			const result = await api.menus.list({ page: 0, size: 100, sort: 'name,asc' });
			menus = result.items;
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function openSession() {
		if (!selectedTableId || opening) return;
		opening = true;
		try {
			await api.dinings.open({ tableId: selectedTableId });
			toastStore.show('Sesi meja dibuka.', 'success');
			showOpen = false;
			selectedTableId = null;
			await loadDinings();
			await loadTables();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			opening = false;
		}
	}

	async function closeSession(dining: DiningResponse) {
		if (!canUpdate) return;
		if (!confirm(`Tutup sesi meja ${dining.tableNumber}?`)) return;
		busyId = dining.id;
		try {
			await api.dinings.close(dining.id);
			toastStore.show(`Sesi meja ${dining.tableNumber} ditutup.`, 'success');
			await loadDinings();
			await loadTables();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			busyId = null;
		}
	}

	async function advanceOrder(orderId: number, action: OrderTransition) {
		busyId = orderId;
		try {
			await api.orders.transition(orderId, action);
			toastStore.show('Status pesanan diperbarui.', 'success');
			await loadDinings();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			busyId = null;
		}
	}

	async function cancelOrder(orderId: number, orderNumber: string) {
		if (!confirm(`Batalkan order #${orderNumber}?`)) return;
		busyId = orderId;
		try {
			await api.orders.transition(orderId, 'cancel');
			toastStore.show(`Order #${orderNumber} dibatalkan.`, 'success');
			await loadDinings();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			busyId = null;
		}
	}

	const canCancelOrder = $derived(
		session.hasAuthority('order.update') || session.hasAuthority('order.*')
	);

	function nextAction(status: string, authorities: readonly string[]) {
		return ORDER_FLOW.find(
			(step) => step.from.includes(status as OrderStatus) && (authorities.includes(step.authority) || authorities.includes('order.*'))
		);
	}

	async function openOrderModal(dining: DiningResponse) {
		orderDining = dining;
		orderLines = [emptyLine()];
		orderCustomer = '';
		orderNotes = '';
		await loadMenus();
	}

	async function submitOrder() {
		if (!orderDining || submittingOrder) return;
		const items = toOrderItems(orderLines);
		if (items.length === 0) {
			toastStore.show('Pilih minimal satu menu.', 'warning');
			return;
		}
		const missing = missingRequiredModifiers(orderLines, menus);
		if (missing.length > 0) {
			toastStore.show(`Modifier wajib belum dipilih: ${missing.join(', ')}`, 'warning');
			return;
		}
		submittingOrder = true;
		try {
			await api.dinings.addOrder(orderDining.id, {
				customerName: orderCustomer.trim() || undefined,
				notes: orderNotes.trim() || undefined,
				items
			});
			toastStore.show('Pesanan ditambahkan ke sesi.', 'success');
			orderDining = null;
			await loadDinings();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			submittingOrder = false;
		}
	}

	async function copyGuestLink(dining: DiningResponse) {
		const url = guestUrl(dining);
		try {
			await navigator.clipboard.writeText(url);
			toastStore.show('Link tamu disalin.', 'success');
		} catch {
			toastStore.show(url, 'info');
		}
	}

	function toggleDetails(id: number) {
		expandedId = expandedId === id ? null : id;
	}

	$effect(() => {
		if (session.status === 'ready' && canRead) {
			untrack(() => {
				void loadDinings();
				void loadTables();
			});
		}
	});
</script>

<svelte:head>
	<title>Sesi Meja — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-6xl">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Sesi Meja</h2>
				<p class="text-muted mt-1 text-xs font-bold">
					{canRead ? `${dinings.length} sesi terbuka` : 'Akses dibatasi'}
				</p>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={() => loadDinings()}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
				>
					<Icon name="refresh" class="h-3.5 w-3.5" /> Muat ulang
				</button>
				{#if canCreate && canReadTables}
					<button
						type="button"
						onclick={() => (showOpen = true)}
						class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold"
					>
						+ Buka Meja
					</button>
				{/if}
			</div>
		</div>

		{#if session.status !== 'ready'}
			<LoadingState label="Menyiapkan sesi meja…" />
		{:else if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="table" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h3 class="font-display text-ink mb-2 text-lg font-extrabold">Akses Dibatasi</h3>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat sesi meja.</p>
			</div>
		{:else}
			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Sesi"
						message={error.message}
						onRetry={() => loadDinings()}
					/>
				</div>
			{/if}

			{#if loading && dinings.length === 0}
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{#each Array(4) as _}
						<div class="bg-shell border-line border-rice rounded-card p-4">
							<div class="skeleton-shimmer mb-4 h-5 w-40 rounded-full"></div>
							<div class="space-y-3">
								<div class="skeleton-shimmer h-4 w-full rounded-full"></div>
								<div class="skeleton-shimmer h-4 w-2/3 rounded-full"></div>
							</div>
						</div>
					{/each}
				</div>
				<p class="text-muted mt-6 text-center text-sm font-bold">Memuat sesi…</p>
			{:else if dinings.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="table" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Tidak ada sesi terbuka.</p>
					<p class="text-faint mt-1 text-xs">Buka sesi baru saat tamu duduk di meja.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{#each dinings as dining (dining.id)}
						{@const invoice = invoicesByDining[dining.id]}
						{@const expanded = expandedId === dining.id}
						<article class="bg-shell border-line border-rice rounded-card rice-lift p-4">
							<header class="flex flex-wrap items-start justify-between gap-2">
								<div class="min-w-0">
									<h3 class="font-display text-ink text-lg font-extrabold">
										Meja {dining.tableNumber}
									</h3>
									<p class="text-muted font-mono text-xs">
										Dibuka {formatWibDateTime(dining.createdAt)}
									</p>
								</div>
								<div class="flex flex-wrap items-center justify-end gap-1.5">
									{#if invoice}
										<span class="rounded-pill border-rice border-line px-2 py-0.5 font-mono text-xs font-bold {invoiceColor(invoice.status)}">
											{invoice.status}
										</span>
									{/if}
									<span class="rounded-pill bg-sky text-inverted border-rice border-line px-2 py-0.5 font-mono text-xs font-bold">
										{dining.status}
									</span>
								</div>
							</header>

							<div class="mt-3 flex flex-wrap items-center gap-2">
								<span class="text-ink font-mono text-lg font-bold">{formatPrice(dining.totalPrice)}</span>
								<span class="text-muted font-mono text-xs">{dining.orders?.length ?? 0} pesanan</span>
							</div>

							<div class="bg-subtle border-line border-rice rounded-btn mt-3 flex flex-wrap items-center gap-2 px-3 py-2">
								<span class="text-muted text-xs font-bold">Kode tamu</span>
								<span class="text-ink font-mono text-sm font-bold tracking-[0.2em]">
									{dining.guestCode}
								</span>
								<button
									type="button"
									onclick={() => copyGuestLink(dining)}
									class="bg-card text-muted hover:text-ink rounded-btn border-rice border-line rice-press ml-auto px-2 py-1 text-xs font-bold"
								>
									<Icon name="copy" class="h-3.5 w-3.5" /> Salin link
								</button>
								<a
									href={`/guest/${dining.guestToken}`}
									target="_blank"
									rel="noopener"
									class="bg-card text-accent rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
								>
									Buka halaman tamu
								</a>
							</div>

							<div class="mt-3 flex flex-wrap gap-2">
								{#if canUpdate && canReadMenu}
									<button
										type="button"
										onclick={() => openOrderModal(dining)}
										class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-3 py-1.5 text-xs font-bold"
									>
										+ Tambah Pesanan
									</button>
								{/if}
								<button
									type="button"
									onclick={() => toggleDetails(dining.id)}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
								>
									{expanded ? 'Sembunyikan pesanan' : 'Lihat pesanan'}
								</button>
								{#if canReadInvoices && invoice}
									<button
										type="button"
										onclick={() => goto(`/invoices?diningId=${dining.id}`)}
										class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
									>
										Tagihan {invoice.invoiceNumber}
									</button>
								{/if}
								{#if canReadPayments && invoice}
									<button
										type="button"
										onclick={() => goto(`/payments?invoiceId=${invoice.id}`)}
										class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
									>
										Bayar
									</button>
								{/if}
								{#if canUpdate}
									<button
										type="button"
										disabled={busyId === dining.id}
										onclick={() => closeSession(dining)}
										class="bg-danger text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
									>
										Tutup Sesi
									</button>
								{/if}
							</div>

							{#if dining.orders && dining.orders.length > 0 && expanded}
								<div class="border-linemuted mt-3 space-y-2 border-t pt-3">
									{#each dining.orders as order (order.id)}
										{@const step = nextAction(order.status, session.user?.authorities ?? [])}
										<div class="bg-subtle border-line border-rice rounded-btn flex flex-wrap items-center gap-2 px-3 py-2">
											<button
												type="button"
												onclick={() => goto(`/orders/${order.id}`)}
												class="text-ink font-mono text-xs font-bold hover:underline"
											>
												{order.orderNumber}
											</button>
											<span class="rounded-pill px-2 py-0.5 font-mono text-[0.65rem] font-bold {orderStatusColor(order.status)}">
												{orderStatusLabel(order.status)}
											</span>
											<span class="text-muted font-mono text-xs">{formatPrice(order.totalPrice)}</span>
											<span class="text-faint ml-auto font-mono text-[0.65rem]">
												{formatWibDateTime(order.createdAt)}
											</span>
											{#if canUpdate && step}
												<button
													type="button"
													disabled={busyId === order.id}
													onclick={() => advanceOrder(order.id, step.action)}
													class="bg-card text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold disabled:opacity-50"
												>
													{step.label}
												</button>
											{/if}
											{#if canCancelOrder && (order.status === 'CREATED' || order.status === 'CONFIRMED')}
												<button
													type="button"
													disabled={busyId === order.id}
													title="Batalkan order (BE: hanya CREATED/CONFIRMED)"
													onclick={() => cancelOrder(order.id, order.orderNumber)}
													class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold disabled:opacity-50"
												>
													Batal
												</button>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</section>

<Modal
	open={showOpen}
	title="Buka Meja Baru"
	subtitle="Sesi meja membuka halaman tamu untuk pemesanan mandiri."
	size="sm"
	onClose={() => (showOpen = false)}
>
	{#if tables.length === 0}
		<p class="text-muted text-sm font-bold">Tidak ada meja kosong saat ini.</p>
	{:else}
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Meja
			<select
				bind:value={selectedTableId}
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
			>
				<option value={null}>Pilih meja...</option>
				{#each tables as table (table.id)}
					<option value={table.id}>Meja {table.tableNumber}</option>
				{/each}
			</select>
		</label>
		<div class="border-linemuted mt-4 flex justify-end gap-2 border-t pt-4">
			<button
				type="button"
				onclick={() => (showOpen = false)}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
			>
				Batal
			</button>
			<button
				type="button"
				disabled={!selectedTableId || opening}
				onclick={openSession}
				class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
			>
				{opening ? 'Membuka...' : 'Buka Meja'}
			</button>
		</div>
	{/if}
</Modal>

<Modal
	open={orderDining !== null}
	title="Tambah Pesanan"
	subtitle={orderDining ? `Meja ${orderDining.tableNumber}` : ''}
	onClose={() => (orderDining = null)}
>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Nama pelanggan (opsional)
			<input
				type="text"
				bind:value={orderCustomer}
				maxlength="50"
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
			/>
		</label>
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Catatan (opsional)
			<input
				type="text"
				bind:value={orderNotes}
				maxlength="255"
				placeholder="cth. tanpa gula"
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
			/>
		</label>
	</div>

	<div class="mt-4">
		<MenuPicker bind:lines={orderLines} {menus} />
	</div>

	<div class="border-linemuted mt-4 flex justify-end gap-2 border-t pt-4">
		<button
			type="button"
			onclick={() => (orderDining = null)}
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
		>
			Batal
		</button>
		<button
			type="button"
			disabled={submittingOrder}
			onclick={submitOrder}
			class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
		>
			{submittingOrder ? 'Menyimpan...' : 'Tambah ke Sesi'}
		</button>
	</div>
</Modal>
