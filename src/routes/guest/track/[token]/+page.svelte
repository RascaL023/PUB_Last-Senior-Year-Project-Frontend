<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { GuestOrderTrackingResponse } from '$lib/domain/order';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	let { params }: { params: { token: string } } = $props();
	const trackToken = $derived(params.token);

	const api = getApi();

	let order = $state<GuestOrderTrackingResponse | null>(null);
	let loading = $state(true);
	let error: string | null = $state(null);
	let polling = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	function statusLabel(status: string): string {
		const labels: Record<string, string> = {
			CREATED: 'Menunggu konfirmasi',
			CONFIRMED: 'Dikonfirmasi',
			PREPARING: 'Disiapkan',
			READY: 'Siap diambil',
			COMPLETED: 'Selesai',
			CANCELLED: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'CREATED':
				return 'bg-honey text-ink';
			case 'CONFIRMED':
			case 'PREPARING':
				return 'bg-sky text-inverted';
			case 'READY':
				return 'bg-ember text-inverted';
			case 'COMPLETED':
				return 'bg-leaf text-inverted';
			case 'CANCELLED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}

	function invoiceLabel(status: string | null): string {
		if (!status) return 'Belum ada tagihan';
		const labels: Record<string, string> = {
			OPEN: 'Belum lunas',
			PARTIALLY_PAID: 'Dibayar sebagian',
			PAID: 'Lunas',
			VOID: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	async function loadOrder() {
		try {
			polling = true;
			error = null;
			order = await api.guestOrders.getByTrackToken(trackToken);
		} catch (e) {
			error = toAppError(e).message;
			toastStore.show(error, 'error');
		} finally {
			loading = false;
			polling = false;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	function formatDateTime(date: string): string {
		return new Date(date + '+07:00').toLocaleString('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	$effect(() => {
		if (trackToken) {
			void loadOrder();
			if (!pollInterval) {
				pollInterval = setInterval(() => {
					void loadOrder();
				}, 8000);
			}
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>Lacak Pesanan — Hysteria Cafe</title>
</svelte:head>

{#if loading}
	<div class="bg-app text-ink flex min-h-screen items-center justify-center">
		<div class="text-center">
			<Icon name="receipt" class="text-muted mx-auto mb-2 h-8 w-8" />
			<p class="text-muted text-sm font-bold">Memuat pesanan...</p>
		</div>
	</div>
{:else if error || !order}
	<div class="bg-app text-ink flex min-h-screen items-center justify-center px-4">
		<ErrorState
			code={404}
			title="Pesanan Tidak Ditemukan"
			message={error ?? 'Tautan pelacakan tidak valid.'}
			icon="receipt"
			retryLabel="Coba lagi"
			onRetry={() => loadOrder()}
		/>
	</div>
{:else}
	<div class="bg-app text-ink min-h-screen pb-20">
		<div class="mx-auto max-w-2xl px-3 py-6 sm:px-6">
			<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Lacak Pesanan</p>
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="font-display text-ink text-2xl font-extrabold">{order.orderNumber}</h2>
				<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(order.status)}">
					{statusLabel(order.status)}
				</span>
			</div>
			<p class="text-muted mt-1 font-mono text-xs">
				{order.type === 'TAKEAWAY' ? 'Takeaway' : 'Dine-in'} · {formatDateTime(order.createdAt)} ·
				{invoiceLabel(order.invoiceStatus)}
				{polling ? ' · ●' : ''}
			</p>

			<hr class="border-line border-rice my-4" />

			<div class="space-y-2">
				{#each order.items as item}
					<div class="bg-shell border-line border-rice rounded-card p-3 text-sm">
						<div class="text-ink flex justify-between">
							<span>{item.itemName} × {item.quantity}</span>
							<span class="font-mono">{formatPrice(item.subtotal)}</span>
						</div>
						{#if item.modifiers && item.modifiers.length > 0}
							<div class="mt-0.5 flex flex-wrap gap-1">
								{#each item.modifiers as mod}
									<span class="bg-subtle text-muted rounded-pill px-1.5 py-0.5 font-mono text-xs">
										{mod.modifierName}
										{#if mod.additionalPrice > 0}
											(+{formatPrice(mod.additionalPrice)})
										{/if}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="bg-shell border-line border-rice rounded-card mt-4 flex items-center justify-between p-4">
				<span class="text-muted text-sm font-bold">Total</span>
				<span class="text-ink font-display text-xl font-extrabold">{formatPrice(order.totalPrice)}</span>
			</div>

			<p class="text-faint mt-4 text-center text-xs">
				Pembayaran dilakukan di kasir. Tunjukkan nomor order ini kepada staf.
			</p>
		</div>
	</div>
{/if}
