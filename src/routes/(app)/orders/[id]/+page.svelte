<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { OrderResponse, OrderStatus, OrderTransition } from '$lib/domain/order';
	import type { InvoiceResponse } from '$lib/domain/invoice';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import { goto } from '$app/navigation';

	let { params }: { params: { id: string } } = $props();
	const orderId = $derived(Number(params.id));

	const api = getApi();

	let order = $state<OrderResponse | null>(null);
	let loading = $state(false);
	let error = $state<AppError | null>(null);
	let invoice = $state<InvoiceResponse | null>(null);

	let editing = $state(false);
	let editCustomer = $state('');
	let editNotes = $state('');
	let saving = $state(false);

	const canRead = $derived(session.hasAuthority('order.read') || session.hasAuthority('order.*'));
	const canUpdate = $derived(session.hasAuthority('order.update') || session.hasAuthority('order.*'));
	const canDelete = $derived(session.hasAuthority('order.delete') || session.hasAuthority('order.*'));

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

	async function loadOrder() {
		if (!canRead || !orderId) return;
		loading = true;
		error = null;
		order = null;
		invoice = null;
		try {
			order = await api.orders.getById(orderId);
			if (order) {
				editCustomer = order.customerName ?? '';
				editNotes = order.notes ?? '';
				try {
					const found = await api.invoices.list({ orderId: order.id, size: 1 });
					invoice = found.items[0] ?? null;
				} catch {
					invoice = null;
				}
			}
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	// PATCH notes/customerName selalu boleh (bahkan setelah invoice dibayar).
	// Perubahan items diblokir BE saat invoice PARTIALLY_PAID/PAID (400).
	const itemsLocked = $derived(
		invoice !== null && (invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PAID')
	);

	async function handleSaveEdit() {
		if (!canUpdate || !order || saving) return;
		saving = true;
		try {
			order = await api.orders.patch(order.id, {
				customerName: editCustomer.trim() || undefined,
				notes: editNotes.trim() || undefined
			});
			editing = false;
			toastStore.show('Order diperbarui.', 'success');
		} catch (e) {
			error = toAppError(e);
		} finally {
			saving = false;
		}
	}

	async function handleTransition(targetStatus: OrderStatus): Promise<void> {
		if (!canUpdate || !order) return;
		const action = transitionAction(order.status, targetStatus);
		if (!confirm(`Yakin ingin ${transitionLabel(action)} order #${order.orderNumber}?`)) return;
		try {
			await api.orders.transition(order.id, action as OrderTransition);
		} catch (e) {
			error = toAppError(e);
		}
		await loadOrder();
	}

	async function handleDelete(): Promise<void> {
		if (!canDelete || !order) return;
		if (!confirm(`Hapus order #${order.orderNumber}? Aksi ini tidak bisa dibatalkan.`)) return;
		try {
			await api.orders.remove(order.id);
			goto('/orders');
		} catch (e) {
			error = toAppError(e);
		}
	}

	$effect(() => {
		if (orderId && canRead) {
			void loadOrder();
		}
	});
</script>

{#if !canRead}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="receipt" class="h-8 w-8 text-muted mx-auto mb-2" />
			<h2 class="font-display text-ink text-xl font-extrabold mb-2">Akses Dibatasi</h2>
			<p class="text-muted text-sm font-bold">Anda tidak memiliki izin untuk melihat order ini.</p>
		</div>
	</div>
{:else if loading || !order}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		{#if loading}
			<p class="text-muted text-sm font-bold">Memuat...</p>
		{:else}
			<Icon name="receipt" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Order tidak ditemukan</p>
		{/if}
	</div>
{:else}
	<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
		<div class="mx-auto max-w-4xl">
			<div class="flex items-center justify-between mb-4">
				<button
					type="button"
					onclick={() => goto('/orders')}
					class="flex items-center gap-2 text-muted hover:text-ink text-sm font-bold"
				>
					<Icon name="chevron-left" class="h-4 w-4" />
					Kembali
				</button>
			</div>

			<div class="mb-4 flex flex-wrap items-center gap-2">
				<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">
					Order #{order.orderNumber}
				</h2>
				{#if invoice}
					<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold
						{invoice.status === 'PAID'
							? 'bg-leaf text-inverted'
							: invoice.status === 'PARTIALLY_PAID'
								? 'bg-sky text-inverted'
								: invoice.status === 'VOID'
									? 'bg-danger text-inverted'
									: 'bg-honey text-ink'}">
						Tagihan: {invoice.status}
					</span>
				{/if}
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Order"
						message={error.message}
						onRetry={() => loadOrder()}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<div>
						<span class="rounded-pill px-3 py-1 font-mono text-xs font-bold {statusColor(order.status)}">
							{statusLabel(order.status)}
						</span>
					</div>
					<span class="text-muted font-mono text-sm">
						{order.type === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}
					</span>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
					<div>
						<span class="text-muted font-mono">Total</span>
						<span class="text-ink font-bold ml-2">{order.totalPrice.toLocaleString('id-ID')}</span>
					</div>
					<div>
						<span class="text-muted font-mono">Dibuat</span>
						<span class="text-ink font-bold ml-2">{new Date(order.createdAt).toLocaleString('id-ID')}</span>
					</div>
					{#if order.customerName}
						<div>
							<span class="text-muted font-mono">Nama Pelanggan</span>
							<span class="text-ink font-bold ml-2">{order.customerName}</span>
						</div>
					{/if}
					{#if order.notes}
						<div>
							<span class="text-muted font-mono">Catatan</span>
							<span class="text-ink font-bold ml-2">{order.notes}</span>
						</div>
					{/if}
				</div>

				{#if canUpdate}
					<div class="border-linemuted mb-4 border-t pt-4">
						{#if editing}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label class="flex flex-col gap-1 text-xs font-bold text-ink">
									Nama pelanggan
									<input
										type="text"
										bind:value={editCustomer}
										maxlength="50"
										class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
									/>
								</label>
								<label class="flex flex-col gap-1 text-xs font-bold text-ink">
									Catatan
									<input
										type="text"
										bind:value={editNotes}
										maxlength="255"
										class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
									/>
								</label>
							</div>
							<div class="mt-3 flex gap-2">
								<button
									type="button"
									disabled={saving}
									onclick={handleSaveEdit}
									class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
								>
									{saving ? 'Menyimpan...' : 'Simpan'}
								</button>
								<button
									type="button"
									onclick={() => (editing = false)}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
								>
									Batal
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => (editing = true)}
								class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
							>
								Ubah nama / catatan
							</button>
						{/if}
						{#if itemsLocked}
							<p class="text-muted mt-2 font-mono text-xs">
								Item terkunci: tagihan {invoice?.status} sudah ada pembayaran (guard BE 400).
							</p>
						{/if}
					</div>
				{/if}

				<h3 class="font-display text-ink text-lg font-bold mb-3">Item Order</h3>
				<div class="space-y-3">
					{#each order.items as item}
						<div class="border-line border-rice border-b pb-3 last:border-b-0 last:pb-0">
							<div class="flex justify-between items-start mb-1">
								<span class="font-bold text-ink">{item.itemName}</span>
								<span class="text-ink font-mono">{item.quantity}x</span>
							</div>
							<div class="text-sm text-muted">
								{item.quantity} × {item.unitPrice.toLocaleString('id-ID')} = {item.subtotal.toLocaleString('id-ID')}
							</div>
							{#if item.modifiers && item.modifiers.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each item.modifiers as mod}
										<span class="bg-subtle text-muted rounded-pill px-2 py-0.5 text-xs font-mono">
											{mod.modifierName}
											{#if mod.additionalPrice > 0}
												(+{mod.additionalPrice.toLocaleString('id-ID')})
											{/if}
										</span>
									{/each}
								</div>
						{/if}
						</div>
					{/each}
				</div>
			</div>

			{#if canUpdate}
				<div class="bg-shell border-line border-rice rounded-card p-4 mb-6">
					<h3 class="font-display text-ink text-lg font-bold mb-3">Aksi Order</h3>
					<div class="flex flex-wrap gap-2">
						{#each availableTransitions(order.status) as targetStatus}
							{@const action = transitionAction(order.status, targetStatus)}
							<button
								type="button"
								onclick={() => handleTransition(targetStatus)}
								class="text-inverted rounded-btn rice-press px-4 py-2 text-sm font-bold {targetStatus === 'CANCELLED' ? 'bg-danger' : targetStatus === 'COMPLETED' ? 'bg-leaf' : 'bg-accent'}"
							>
								{transitionLabel(action)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if canDelete}
				<div class="border-line border-rice border-t pt-4">
					<button
						type="button"
						onclick={handleDelete}
						class="bg-danger text-inverted rounded-btn rice-press px-4 py-2 text-sm font-bold"
					>
						Hapus Order
					</button>
				</div>
			{/if}
		</div>
	</section>
{/if}
