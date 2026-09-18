<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getApi } from '$lib/infrastructure/api/index';
	import { session } from '$lib/stores';
	import type { GuestDiningResponse } from '$lib/domain/guest-dining';
	import type { MenuResponse, MenuListQuery } from '$lib/domain/menu';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	let { params }: { params: { token: string } } = $props();
	const guestToken = $derived(params.token);

	const api = getApi();

	let dining = $state<GuestDiningResponse | null>(null);
	let loading = $state(true);
	let error: string | null = $state(null);
	let forbidden = $state(false);

	let menus = $state<MenuResponse[]>([]);
	let expandedMenuId = $state<number | null>(null);
	let orderQty = $state(1);
	let orderOptions: Record<number, number[]> = $state({});
	let orderName = $state('');
	let orderNotes = $state('');
	let submitting = $state(false);

	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function loadDining() {
		try {
			error = null;
			forbidden = false;
			dining = await api.dinings.myDiningByToken(guestToken);
		} catch (e) {
			const appErr = toAppError(e);
			if (appErr.status === 403) {
				forbidden = true;
				error = 'Akun ini belum punya profil member. Hubungi staf untuk mendaftarkan profilmu.';
			} else {
				error = appErr.message;
			}
			toastStore.show(error, 'error');
		} finally {
			loading = false;
		}
	}

	async function loadMenus() {
		try {
			const query: MenuListQuery = { page: 0, size: 50, sort: 'name,asc' };
			const result = await api.menus.list(query, { auth: false });
			menus = result.items;
		} catch {
			menus = [];
		}
	}

	function toggleOptions(modTypeId: number, optionId: number, maxSelection: number) {
		const current = orderOptions[modTypeId] ?? [];
		if (current.includes(optionId)) {
			orderOptions[modTypeId] = current.filter((id) => id !== optionId);
		} else if (maxSelection === 1) {
			orderOptions[modTypeId] = [optionId];
		} else {
			orderOptions[modTypeId] = [...current, optionId];
		}
	}

	async function submitOrder(menu: MenuResponse) {
		if (submitting) return;
		submitting = true;
		try {
			await api.dinings.myAddOrder(guestToken, {
				customerName: orderName.trim() || undefined,
				notes: orderNotes.trim() || undefined,
				items: [
					{
						menuId: menu.id,
						quantity: orderQty,
						modifiers: Object.values(orderOptions)
							.flat()
							.map((modifierOptionId) => ({ modifierOptionId }))
					}
				]
			});
			toastStore.show('Pesanan ditambahkan ke sesi kamu!', 'success');
			expandedMenuId = null;
			orderQty = 1;
			orderOptions = {};
			orderName = '';
			orderNotes = '';
			await loadDining();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			submitting = false;
		}
	}

	function orderStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			CREATED: 'Menunggu konfirmasi',
			CONFIRMED: 'Dikonfirmasi',
			PREPARING: 'Disiapkan',
			READY: 'Siap',
			COMPLETED: 'Selesai',
			CANCELLED: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	$effect(() => {
		if (session.status === 'ready' && session.isLoggedIn && guestToken) {
			void loadDining();
			void loadMenus();
			if (!pollInterval) {
				pollInterval = setInterval(() => {
					void loadDining();
				}, 8000);
			}
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>Sesi Saya — Hysteria Cafe</title>
</svelte:head>

{#if loading}
	<div class="bg-app text-ink flex min-h-screen items-center justify-center">
		<p class="text-muted text-sm font-bold">Memuat sesi...</p>
	</div>
{:else if error || !dining}
	<div class="bg-app text-ink flex min-h-screen items-center justify-center px-4">
		<ErrorState
			code={forbidden ? 403 : undefined}
			title={forbidden ? 'Profil Member Dibutuhkan' : 'Sesi Tidak Ditemukan'}
			message={error ?? 'Sesi tidak dapat dimuat.'}
			onRetry={() => {
				loading = true;
				void loadDining();
			}}
		/>
	</div>
{:else}
	<div class="bg-app text-ink min-h-screen pb-20">
		<div class="mx-auto max-w-4xl px-3 py-6 sm:px-6">
			<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Sesi Saya</p>
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="font-display text-ink text-2xl font-extrabold">
					Meja {dining.tableNumber} · {formatPrice(dining.totalPrice)}
				</h2>
				<span
					class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {dining.invoiceStatus === 'PAID'
						? 'bg-leaf text-inverted'
						: dining.invoiceStatus === 'PARTIALLY_PAID'
							? 'bg-sky text-inverted'
							: dining.invoiceStatus === 'VOID'
								? 'bg-danger text-inverted'
								: dining.invoiceStatus === 'OPEN'
									? 'bg-honey text-ink'
									: 'bg-subtle text-muted'}"
				>
					{dining.invoiceStatus ?? 'Belum ada tagihan'}
				</span>
			</div>
			<p class="text-muted mt-1 font-mono text-xs">Pesanan terhubung ke profil membermu.</p>

			<hr class="border-line border-rice my-4" />

			<h3 class="font-display text-ink mb-3 text-lg font-bold">Tambah Pesanan</h3>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each menus as menu}
					<div class="bg-shell border-line border-rice rounded-card overflow-hidden">
						<button
							type="button"
							onclick={() => {
								expandedMenuId = expandedMenuId === menu.id ? null : menu.id;
								orderQty = 1;
								orderOptions = {};
							}}
							class="w-full p-3 text-left rice-lift"
						>
							{#if menu.imageUrls && menu.imageUrls.length > 0}
								<img src={menu.imageUrls[0]} alt={menu.name} class="bg-subtle rounded-card mb-2 aspect-square w-full object-cover" />
							{:else}
								<div class="bg-subtle rounded-card mb-2 flex aspect-square w-full items-center justify-center">
									<span class="text-3xl">☕</span>
								</div>
							{/if}
							<h4 class="text-ink text-sm font-bold">{menu.name}</h4>
							<p class="text-muted font-mono text-xs">{formatPrice(menu.basePrice)}</p>
						</button>
						{#if expandedMenuId === menu.id}
							<div class="border-linemuted border-t p-3">
								{#if menu.modifierTypes && menu.modifierTypes.length > 0}
									{#each menu.modifierTypes as modType}
										<p class="text-ink mb-1 text-xs font-bold">{modType.name}</p>
										<div class="mb-2 flex flex-wrap gap-1">
											{#each modType.options as opt}
												<button
													type="button"
													onclick={() => toggleOptions(modType.id, opt.id, modType.maxSelection)}
													class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs font-bold
														{(orderOptions[modType.id] ?? []).includes(opt.id)
															? 'bg-accent text-inverted'
															: 'bg-subtle text-muted'}"
												>
													{opt.name}
												</button>
											{/each}
										</div>
									{/each}
								{/if}
								<div class="mb-2 flex items-center gap-2">
									<button
										type="button"
										onclick={() => (orderQty = Math.max(1, orderQty - 1))}
										class="bg-subtle text-ink rounded-btn rice-press px-2 py-1 font-bold"
									>
										-
									</button>
									<span class="text-ink w-8 text-center font-mono">{orderQty}</span>
									<button
										type="button"
										onclick={() => (orderQty = orderQty + 1)}
										class="bg-subtle text-ink rounded-btn rice-press px-2 py-1 font-bold"
									>
										+
									</button>
								</div>
								<input
									type="text"
									bind:value={orderName}
									placeholder="Nama (opsional)"
									class="bg-subtle text-ink border-line border-rice rounded-btn mb-2 w-full px-2 py-1.5 text-xs outline-none placeholder:text-faint"
								/>
								<button
									type="button"
									disabled={submitting}
									onclick={() => submitOrder(menu)}
									class="bg-accent text-inverted rounded-btn border-rice border-line rice-press w-full px-3 py-2 text-xs font-bold disabled:opacity-50"
								>
									{submitting ? 'Mengirim...' : 'Tambah ke Sesi'}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<hr class="border-line border-rice my-4" />

			<h3 class="font-display text-ink mb-3 text-lg font-bold">Pesanan Sesi Ini</h3>
			{#if dining.orders.length === 0}
				<p class="text-muted text-sm font-bold">Belum ada pesanan di sesi ini.</p>
			{:else}
				<div class="space-y-3">
					{#each dining.orders as order}
						<div class="bg-shell border-line border-rice rounded-card p-3">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-ink font-mono text-sm font-bold">{order.orderNumber}</span>
								<span class="rounded-pill bg-subtle text-muted px-2 py-0.5 font-mono text-xs font-bold">
									{orderStatusLabel(order.status)}
								</span>
							</div>
							{#if order.items && order.items.length > 0}
								<div class="mt-1 space-y-1 text-sm">
									{#each order.items as item}
										<div class="text-ink flex justify-between">
											<span>{item.itemName} × {item.quantity}</span>
											<span class="font-mono">{formatPrice(item.subtotal)}</span>
										</div>
										{#if item.modifiers && item.modifiers.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each item.modifiers as mod}
													<span class="bg-subtle text-muted rounded-pill px-1.5 py-0.5 font-mono text-xs">
														{mod.modifierName}{mod.additionalPrice > 0
															? ` (+${formatPrice(mod.additionalPrice)})`
															: ''}
													</span>
												{/each}
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
