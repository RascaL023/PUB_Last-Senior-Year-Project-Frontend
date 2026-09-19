<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibDateTime } from '$lib/core/time/wib';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import type { AppError } from '$lib/core/http/http-errors';
	import {
		orderStatusColor,
		orderStatusLabel,
		orderStepsFor,
		orderStepVariantClass,
		type OrderResponse,
		type OrderStatus,
		type OrderStep
	} from '$lib/domain/order';
	import type { MenuResponse } from '$lib/domain/menu';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import TableSkeleton from '$lib/components/ui/TableSkeleton.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import MenuPicker, {
		emptyLine,
		missingRequiredModifiers,
		toOrderItems,
		type MenuPickerLine
	} from '$lib/components/order/MenuPicker.svelte';

	const api = getApi();

	const STATUS_FILTERS: { value: OrderStatus; label: string }[] = [
		{ value: 'CREATED', label: 'Menunggu' },
		{ value: 'CONFIRMED', label: 'Dikonfirmasi' },
		{ value: 'PREPARING', label: 'Disiapkan' },
		{ value: 'READY', label: 'Siap' },
		{ value: 'COMPLETED', label: 'Selesai' },
		{ value: 'CANCELLED', label: 'Dibatalkan' }
	];

	let orders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let busyId = $state<number | null>(null);
	let error: AppError | null = $state(null);

	let statusFilters = $state<OrderStatus[]>([]);
	let keyword = $state('');
	let sortOrder = $state<'createdAt,desc' | 'createdAt,asc'>('createdAt,desc');

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let showCreate = $state(false);
	let menus = $state<MenuResponse[]>([]);
	let menusLoaded = $state(false);
	let newCustomer = $state('');
	let newNotes = $state('');
	let lines = $state<MenuPickerLine[]>([emptyLine()]);
	let creating = $state(false);
	let createdNumber = $state<string | null>(null);
	let createdTrack = $state<string | null>(null);

	const authorities = $derived(session.user?.authorities ?? []);
	const canRead = $derived(
		session.hasAuthority('order.read') || session.hasAuthority('order.*')
	);
	const canUpdate = $derived(
		session.hasAuthority('order.update') || session.hasAuthority('order.*')
	);
	const canCreate = $derived(
		session.hasAuthority('order.create') || session.hasAuthority('order.*')
	);
	const canOpenSession = $derived(
		session.hasAuthority('dining.create') || session.hasAuthority('dining.*')
	);

	async function loadOrders(target = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result = await api.orders.list({
				page: target,
				size: 20,
				keyword: keyword.trim() || undefined,
				status: statusFilters.length > 0 ? statusFilters : undefined,
				sort: sortOrder
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

	async function handleTransition(order: OrderResponse, step: OrderStep) {
		if (!canUpdate || busyId === order.id) return;
		if (!confirm(`${step.label} order #${order.orderNumber}?`)) return;
		busyId = order.id;
		try {
			await api.orders.transition(order.id, step.action);
			toastStore.show(`Order #${order.orderNumber} ${step.label.toLowerCase()}.`, 'success');
			await loadOrders(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			busyId = null;
		}
	}

	async function openCreate() {
		showCreate = !showCreate;
		createdNumber = null;
		createdTrack = null;
		if (!showCreate) return;
		if (!menusLoaded) {
			try {
				const result = await api.menus.list({ page: 0, size: 100, sort: 'name,asc' });
				menus = result.items;
				menusLoaded = true;
			} catch (e) {
				toastStore.show(toAppError(e).message, 'error');
			}
		}
		if (lines.length === 0) lines = [emptyLine()];
	}

	async function submitTakeaway() {
		const items = toOrderItems(lines);
		if (items.length === 0 || creating) {
			toastStore.show('Pilih minimal satu menu.', 'warning');
			return;
		}
		const missing = missingRequiredModifiers(lines, menus);
		if (missing.length > 0) {
			toastStore.show(`Modifier wajib belum dipilih: ${missing.join(', ')}`, 'warning');
			return;
		}
		creating = true;
		try {
			const created = await api.orders.create({
				type: 'TAKEAWAY',
				customerName: newCustomer.trim() || undefined,
				notes: newNotes.trim() || undefined,
				items
			});
			if (!created) throw new Error('Respons kosong dari server');
			createdNumber = created.orderNumber;
			createdTrack = created.trackToken;
			toastStore.show(`Order ${created.orderNumber} dibuat.`, 'success');
			lines = [emptyLine()];
			newCustomer = '';
			newNotes = '';
			await loadOrders(0);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			creating = false;
		}
	}

	function search() {
		void loadOrders(0);
	}

	function toggleStatusFilter(value: OrderStatus) {
		statusFilters = statusFilters.includes(value)
			? statusFilters.filter((s) => s !== value)
			: [...statusFilters, value];
		void loadOrders(0);
	}

	function resetFilters() {
		keyword = '';
		statusFilters = [];
		void loadOrders(0);
	}

	function toggleSort() {
		sortOrder = sortOrder === 'createdAt,desc' ? 'createdAt,asc' : 'createdAt,desc';
		void loadOrders(0);
	}

	async function copyTrackLink(trackToken: string, orderNumber: string) {
		const url = `${window.location.origin}/guest/track/${trackToken}`;
		try {
			await navigator.clipboard.writeText(url);
			toastStore.show(`Link tracking ${orderNumber} disalin.`, 'success');
		} catch {
			toastStore.show(url, 'info');
		}
	}

	function changePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		void loadOrders(target - 1);
	}

	$effect(() => {
		if (session.status === 'ready' && canRead) {
			untrack(() => void loadOrders(0));
		}
	});
</script>

<svelte:head>
	<title>Pesanan — Hysteria Cafe</title>
</svelte:head>

<section class="app-main bg-app text-ink px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		<PageHeader title="Daftar Pesanan" subtitle={`${totalItems} pesanan`}>
			{#if canOpenSession}
				<button
					type="button"
					onclick={() => goto('/dinings')}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
				>
					<Icon name="table" class="h-3.5 w-3.5" /> Sesi meja (dine-in)
				</button>
			{/if}
			{#if canCreate}
				<button
					type="button"
					onclick={openCreate}
					class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold"
				>
					{showCreate ? 'Tutup' : '+ Takeaway'}
				</button>
			{/if}
		</PageHeader>

		{#if session.status !== 'ready'}
			<LoadingState label="Menyiapkan pesanan…" />
		{:else if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin untuk melihat daftar order.</p>
			</div>
		{:else}
			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Order"
						message={error.message}
						onRetry={() => loadOrders(currentPage - 1)}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4">
				<div class="flex flex-col gap-3 sm:flex-row">
					<input
						type="text"
						placeholder="Cari nomor order / pelanggan..."
						bind:value={keyword}
						onkeydown={(e) => e.key === 'Enter' && search()}
						class="bg-subtle text-ink border-line border-rice rounded-btn w-full flex-1 px-3 py-2 text-sm font-bold"
					/>
					<button
						type="button"
						onclick={search}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
					>
						Cari
					</button>
					<button
						type="button"
						onclick={toggleSort}
						title={sortOrder === 'createdAt,desc' ? 'Terbaru dulu — klik untuk tertua dulu' : 'Tertua dulu — klik untuk terbaru dulu'}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
					>
						{sortOrder === 'createdAt,desc' ? '↓ Terbaru' : '↑ Tertua'}
					</button>
					{#if keyword || statusFilters.length > 0}
						<button
							type="button"
							onclick={resetFilters}
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
						>
							Reset
						</button>
					{/if}
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each STATUS_FILTERS as filter (filter.value)}
						{@const active = statusFilters.includes(filter.value)}
						<button
							type="button"
							onclick={() => toggleStatusFilter(filter.value)}
							aria-pressed={active}
							class="rounded-pill border-rice border-line rice-press px-3 py-1 font-mono text-xs font-bold {active
								? 'bg-accent text-inverted'
								: 'bg-subtle text-muted hover:text-ink'}"
						>
							{filter.label}
						</button>
					{/each}
				</div>
				{#if statusFilters.length > 0}
					<p class="text-faint font-mono text-[0.65rem]">
						Filter: {statusFilters.join(', ')} · BE menerima multi-nilai & alias (CREATE/CONFIRM/PREPARE/COMPLETE/CANCEL).
					</p>
				{/if}
			</div>

			{#if loading && orders.length === 0}
				<TableSkeleton rows={6} columns={6} label="Memuat pesanan…" />
			{:else if orders.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada order yang cocok.</p>
				</div>
			{:else}
				<div class="bg-shell border-line border-rice rounded-card overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">No. Order</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Tipe</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Status</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Total</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Dibuat</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each orders as order (order.id)}
								<tr class="border-line border-rice border-b last:border-b-0">
									<td class="px-4 py-3">
										<button
											type="button"
											onclick={() => goto(`/orders/${order.id}`)}
											class="text-ink font-mono font-bold hover:underline"
										>
											{order.orderNumber}
										</button>
									</td>
									<td class="text-muted px-4 py-3">
										{order.type === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}
									</td>
									<td class="px-4 py-3">
										<span class="rounded-pill border-rice border-line px-2 py-0.5 font-mono text-xs font-bold {orderStatusColor(order.status)}">
											{orderStatusLabel(order.status)}
										</span>
									</td>
									<td class="text-ink px-4 py-3 font-mono">
										{order.totalPrice.toLocaleString('id-ID')}
									</td>
									<td class="text-muted px-4 py-3 font-mono text-xs">
										{formatWibDateTime(order.createdAt)}
									</td>
									<td class="px-4 py-3">
										<div class="flex flex-wrap justify-end gap-1.5">
											<button
												type="button"
												onclick={() => goto(`/orders/${order.id}`)}
												class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold"
											>
												Detail
											</button>
											{#if order.trackToken}
												<a
													href={`/guest/track/${order.trackToken}`}
													target="_blank"
													rel="noopener"
													title="Buka halaman tracking tamu"
													class="bg-subtle text-accent rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
												>
													Tracking
												</a>
												<button
													type="button"
													onclick={() => copyTrackLink(order.trackToken, order.orderNumber)}
													title="Salin link tracking untuk dibagikan via WA/struk"
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
												>
													Salin link
												</button>
											{/if}
											{#if canUpdate}
												{#each orderStepsFor(order.status, authorities) as step (step.action)}
													<button
														type="button"
														disabled={busyId === order.id}
														onclick={() => handleTransition(order, step)}
														class="rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50 {orderStepVariantClass(step)}"
													>
														{step.label}
													</button>
												{/each}
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if totalPages > 1}
					<div class="mt-4 flex items-center justify-between text-sm">
						<button
							type="button"
							onclick={() => changePage(-1)}
							disabled={currentPage <= 1 || loading}
							class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
						>
							Sebelumnya
						</button>
						<span class="text-muted font-mono text-xs">
							Halaman {currentPage} dari {totalPages} ({totalItems} order)
						</span>
						<button
							type="button"
							onclick={() => changePage(1)}
							disabled={currentPage >= totalPages || loading}
							class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
						>
							Berikutnya
						</button>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</section>

<Modal
	open={showCreate && canCreate}
	title="Pesanan Takeaway Baru"
	subtitle="Tagihan dibuat otomatis oleh server setelah pesanan masuk."
	onClose={() => (showCreate = false)}
>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Nama pelanggan (opsional)
			<input
				type="text"
				bind:value={newCustomer}
				maxlength="50"
				placeholder="cth. Budi"
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
			/>
		</label>
		<label class="flex flex-col gap-1 text-xs font-bold text-ink">
			Catatan (opsional)
			<input
				type="text"
				bind:value={newNotes}
				maxlength="255"
				placeholder="cth. es sedikit"
				class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
			/>
		</label>
	</div>
	<div class="mt-4">
		<MenuPicker bind:lines {menus} />
	</div>
	<div class="border-linemuted mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
		{#if createdNumber && createdTrack}
			<div class="bg-subtle border-line border-rice rounded-btn mr-auto flex flex-wrap items-center gap-2 px-3 py-2">
				<a
					href={`/guest/track/${createdTrack}`}
					target="_blank"
					rel="noopener"
					class="text-accent text-xs font-bold hover:underline"
				>
					{createdNumber} → lacak &amp; bagikan
				</a>
				<button
					type="button"
					onclick={() => createdTrack && copyTrackLink(createdTrack, createdNumber ?? '')}
					class="bg-card text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
				>
					Salin link tracking
				</button>
			</div>
		{/if}
		<button
			type="button"
			onclick={() => (showCreate = false)}
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
		>
			Tutup
		</button>
		<button
			type="button"
			disabled={creating}
			onclick={submitTakeaway}
			class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
		>
			{creating ? 'Menyimpan...' : 'Buat Pesanan'}
		</button>
	</div>
</Modal>
