<script lang="ts">
	import { onDestroy } from 'svelte';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { KitchenTicket, KitchenListQuery, OrderStatus } from '$lib/domain/order';
	import Icon from '$lib/components/ui/Icon.svelte';

	const api = getApi();

	let tickets = $state<KitchenTicket[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let polling = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	const canPrepare = $derived(
		session.hasAuthority('order.mark.preparing') || session.hasAuthority('order.*')
	);
	const canReady = $derived(session.hasAuthority('order.mark.ready') || session.hasAuthority('order.*'));

	async function loadTickets() {
		if (!session.hasAuthority('kitchen.read')) return;
		loading = true;
		error = null;
		try {
			const query: KitchenListQuery = { status: 'CONFIRMED,PREPARING' };
			tickets = (await api.kitchen.list(query)) ?? [];
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function handlePrepare(orderId: number): Promise<void> {
		if (!canPrepare) return;
		polling = true;
		try {
			await api.orders.transition(orderId, 'prepare');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			polling = false;
			await loadTickets();
		}
	}

	async function handleReady(orderId: number): Promise<void> {
		if (!canReady) return;
		polling = true;
		try {
			await api.orders.transition(orderId, 'ready');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			polling = false;
			await loadTickets();
		}
	}

	function statusLabel(status: OrderStatus): string {
		const labels: Record<string, string> = {
			CREATED: 'Baru',
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
			case 'CONFIRMED':
				return 'bg-sky text-inverted';
			case 'PREPARING':
				return 'bg-ember text-inverted';
			case 'READY':
				return 'bg-grape text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}

	function formatTime(date: string): string {
		return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	function startPolling() {
		if (pollInterval) return;
		pollInterval = setInterval(() => {
			void loadTickets();
		}, 8000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	$effect(() => {
		if (session.status === 'ready' && session.hasAuthority('kitchen.read')) {
			void loadTickets();
			startPolling();
		}
	});

	onDestroy(() => stopPolling());
</script>

<svelte:head>
	<title>Kitchen — Hysteria Cafe</title>
</svelte:head>

<div class="p-6 bg-app min-h-screen">
	<div class="flex justify-between items-center mb-6">
		<h2 class="font-display text-ink text-2xl font-extrabold">Dapur</h2>
		<span class="text-muted text-xs font-mono">{polling ? '● Menyinkronisasi...' : 'Siap'}</span>
	</div>

	{#if error}
		<div class="bg-danger/10 border border-danger rounded-card px-4 py-3 text-sm text-ink mb-4">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12 text-muted">Memuat antrean...</div>
	{:else if tickets.length === 0}
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Tidak ada pesanan yang perlu disiapkan saat ini</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each tickets as ticket (ticket.orderId)}
				<div class="bg-shell border-line border-rice rounded-card p-4 rice-lift">
					<div class="flex justify-between items-center mb-2">
						<span class="font-mono text-ink font-bold">{ticket.orderNumber}</span>
						<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(ticket.status)}">
							{statusLabel(ticket.status)}
						</span>
					</div>

					{#if ticket.tableNumber}
						<span class="text-muted text-xs font-mono mb-2 block">Meja {ticket.tableNumber}</span>
					{/if}

					<span class="text-muted text-xs font-mono block mb-3">
						{new Date(ticket.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
					</span>

					{#if ticket.notes}
						<div class="bg-subtle rounded-btn px-2 py-1 mb-2">
							<span class="text-xs text-ink font-bold">{ticket.notes}</span>
						</div>
					{/if}

					<div class="space-y-2 mb-4">
						{#each ticket.items as item}
							<div>
								<div class="flex justify-between text-ink font-bold">
									<span>{item.itemName}</span>
									<span class="font-mono">{item.quantity}x</span>
								</div>
								{#if item.modifiers && item.modifiers.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each item.modifiers as mod}
											<span class="bg-subtle text-muted rounded-pill px-1.5 py-0.25 text-xs font-mono">
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

					<div class="flex gap-2">
						{#if ticket.status === 'CONFIRMED' && canPrepare}
							<button
								type="button"
								onclick={() => handlePrepare(ticket.orderId)}
								disabled={polling}
								class="bg-ember text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold flex-1"
							>
								Mulai
							</button>
						{:else if ticket.status === 'PREPARING' && canReady}
							<button
								type="button"
								onclick={() => handleReady(ticket.orderId)}
								disabled={polling}
								class="bg-grape text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold flex-1"
							>
								Siap
							</button>
						{:else}
							<div class="bg-subtle text-muted rounded-btn px-3 py-1.5 text-xs font-bold flex-1 text-center">
								Selesai
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
