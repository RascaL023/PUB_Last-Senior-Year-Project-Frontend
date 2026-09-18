<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { GuestDiningResponse, GuestOrderRequest } from '$lib/domain/guest-dining';
	import type { MenuResponse, MenuListQuery } from '$lib/domain/menu';
	import type { MenuCategoryResponse } from '$lib/domain/menu-category';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibDateTime } from '$lib/core/time/wib';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import CartDrawer from '$lib/components/cart/CartDrawer.svelte';
	import { cart } from '$lib/stores';

	let { params }: { params: { token: string } } = $props();
	const routeParam = $derived(params.token);

	const api = getApi();

	let dining = $state<GuestDiningResponse | null>(null);
	// Token mentah yang dipakai ke BE. Bisa berbeda dari routeParam bila
	// pengunjung datang dari halaman kode (param = btoa(kode)).
	let apiToken = $state<string | null>(null);
	let displayCode = $state<string | null>(null);
	let loading = $state(true);
	let error: string | null = $state(null);
	let polling = $state(false);

	let menus = $state<MenuResponse[]>([]);
	let categories = $state<MenuCategoryResponse[]>([]);
	let menuLoading = $state(false);
	let menuError: string | null = $state(null);

	let selectedMenu: MenuResponse | null = $state(null);
	let selectedQuantity = $state(1);
	let selectedModifiers: Record<number, number[]> = $state({});
	let customerName = $state('');
	let orderNotes = $state('');
	let showMenuModal = $state(false);

	let pollInterval: ReturnType<typeof setInterval> | null = null;

	function invoiceStatusLabel(status: string | null): string {
		if (!status) return 'Belum ada tagihan';
		const labels: Record<string, string> = {
			OPEN: 'Terbuka',
			PARTIALLY_PAID: 'Dibayar sebagian',
			PAID: 'Lunas',
			VOID: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function invoiceStatusColor(status: string | null): string {
		switch (status) {
			case 'PAID':
				return 'bg-leaf text-inverted';
			case 'PARTIALLY_PAID':
				return 'bg-sky text-inverted';
			case 'OPEN':
				return 'bg-honey text-ink';
			case 'VOID':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
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

	function orderStatusColor(status: string): string {
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

	function safeDecodeCode(value: string): string | null {
		try {
			const decoded = atob(value);
			return /^\d{6}$/.test(decoded) ? decoded : null;
		} catch {
			return null;
		}
	}

	async function loadDining() {
		try {
			polling = true;
			error = null;
			try {
				// Jalur utama: link QR/staf membawa guestToken mentah.
				dining = await api.guestDinings.getByToken(routeParam);
				apiToken = routeParam;
				displayCode = safeDecodeCode(routeParam);
			} catch {
				// Fallback: param = btoa(kode 6 digit) dari halaman /guest.
				const code = atob(routeParam);
				dining = await api.guestDinings.getByCode(code);
				apiToken = null;
				displayCode = code;
			}
		} catch (e) {
			error = toAppError(e).message;
			toastStore.show(error, 'error');
		} finally {
			loading = false;
			polling = false;
		}
	}

	async function loadMenus() {
		menuLoading = true;
		menuError = null;
		try {
			const query: MenuListQuery = { page: 0, size: 50, sort: 'name,asc' };
			const result = await api.menus.list(query, { auth: false });
			menus = result.items;
		} catch (e) {
			menuError = toAppError(e).message;
		} finally {
			menuLoading = false;
		}
	}

	async function loadCategories() {
		try {
			const result = await api.categories.list({ size: 50 }, { auth: false });
			categories = result.items;
		} catch {
			categories = [];
		}
	}

	async function orderSingleItem() {
		if (!selectedMenu) return;
		if (!apiToken) {
			toastStore.show('Untuk memesan, pindai QR di meja (kode angka hanya untuk melihat).', 'warning');
			return;
		}
		const missing = missingRequiredModifiers(selectedMenu);
		if (missing.length > 0) {
			toastStore.show(`Modifier wajib belum dipilih: ${missing.join(', ')}`, 'warning');
			return;
		}
		try {
			const items: GuestOrderRequest['items'] = [{
				menuId: selectedMenu.id,
				quantity: selectedQuantity,
				modifiers: Object.values(selectedModifiers)
					.flat()
					.map((modifierOptionId) => ({ modifierOptionId }))
			}];

			await api.guestDinings.addOrder(apiToken, {
				items,
				customerName: customerName.trim() || undefined,
				notes: orderNotes.trim() || undefined
			});
			toastStore.show('Pesanan ditambahkan!', 'success');
			selectedMenu = null;
			selectedQuantity = 1;
			selectedModifiers = {};
			customerName = '';
			orderNotes = '';
			showMenuModal = false;
			await loadDining();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function toggleModifier(
		modTypeId: number,
		optionId: number,
		maxSelection: number,
		checked: boolean
	) {
		const current = selectedModifiers[modTypeId] ?? [];
		if (!checked) {
			selectedModifiers = {
				...selectedModifiers,
				[modTypeId]: current.filter((id) => id !== optionId)
			};
			return;
		}
		// maxSelection = 1 → pilihan saling eksklusif.
		selectedModifiers = {
			...selectedModifiers,
			[modTypeId]: maxSelection === 1 ? [optionId] : [...current, optionId]
		};
	}

	function missingRequiredModifiers(menu: MenuResponse): string[] {
		return (menu.modifierTypes ?? [])
			.filter((type) => {
				const picked = selectedModifiers[type.id]?.length ?? 0;
				return picked < type.minSelection;
			})
			.map((type) => type.name);
	}

	function startPolling() {
		if (pollInterval) return;
		pollInterval = setInterval(() => {
			// Tab tersembunyi tidak perlu ikut polling.
			if (typeof document !== 'undefined' && document.hidden) return;
			void loadDining();
		}, 7000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	let submittingCart = $state(false);
	const cartSessionActive = $derived(!!apiToken && dining?.status === 'OPEN');

	/** Kirim seluruh isi keranjang landing dalam 1 request pesanan tamu. */
	async function submitCart(info: { customerName: string; notes: string }) {
		if (!apiToken || submittingCart || cart.isEmpty) return;
		const items = cart.toGuestItems();
		submittingCart = true;
		try {
			await api.guestDinings.addOrder(apiToken, {
				items,
				customerName: info.customerName.trim() || undefined,
				notes: info.notes.trim() || undefined
			});
			const kinds = items.length;
			cart.clear();
			cart.close();
			toastStore.show(`Keranjang terkirim (${kinds} jenis item)!`, 'success');
			await loadDining();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
			throw e;
		} finally {
			submittingCart = false;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	function copySessionLink() {
		const url = typeof window === 'undefined' ? routeParam : window.location.href;
		try {
			void navigator.clipboard.writeText(url);
			toastStore.show('Link sesi disalin — bagikan ke teman semeja.', 'success');
		} catch {
			toastStore.show(url, 'info');
		}
	}

	$effect(() => {
		if (routeParam) {
			void loadDining();
			void loadMenus();
			void loadCategories();
			startPolling();
		}
	});

	onDestroy(() => stopPolling());
</script>

<svelte:head>
	<title>Pesanan Saya — Hysteria Cafe</title>
</svelte:head>

{#if loading}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Icon name="receipt" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Memuat sesi...</p>
		</div>
	</div>
{:else if error}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center px-4">
		<ErrorState
			code={404}
			title="Sesi Tidak Ditemukan"
			message={error}
			icon="receipt"
			retryLabel="Ke Halaman Tamu"
			onRetry={() => {
				window.location.href = '/guest';
			}}
		/>
	</div>
{:else if dining}
	<div class="bg-app text-ink min-h-screen pb-20">
		<div class="mx-auto max-w-4xl px-3 py-6 sm:px-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<span class="font-mono text-muted font-bold">Meja {dining.tableNumber}</span>
					{#if displayCode}
						<span class="rounded-pill bg-subtle text-muted px-2 py-0.5 text-xs font-mono">
							Kode: {displayCode}
						</span>
					{/if}
				</div>
				<span class="rounded-pill px-2 py-0.5 text-xs font-bold {invoiceStatusColor(dining.invoiceStatus)}">
					{invoiceStatusLabel(dining.invoiceStatus)}
				</span>
				<button
					type="button"
					onclick={() => cart.open()}
					aria-label="Buka keranjang, {cart.itemCount} item"
					class="bg-subtle text-ink rounded-btn border-rice border-line rice-press relative px-3 py-1.5 text-xs font-bold"
				>
					Keranjang
					{#if cart.itemCount > 0}
						<span class="bg-danger text-inverted rounded-pill px-1.5 py-0.5 font-mono text-[10px] font-bold">
							{cart.itemCount}
						</span>
					{/if}
				</button>
			</div>

			<h2 class="font-display text-ink text-2xl font-extrabold mb-2">
				Total: {formatPrice(dining.totalPrice)}
			</h2>
			<span class="text-sm text-muted font-bold {polling ? 'text-sky' : ''}">
				{polling ? '● Sedang memperbarui...' : '✓ Diperbarui'}
			</span>
			{#if dining.status === 'CLOSED'}
				<div class="bg-subtle border-line border-rice rounded-card mt-3 px-4 py-3 text-sm text-muted font-bold">
					Sesi ini sudah selesai — kamu masih bisa melihat riwayat di bawah, tapi tidak bisa menambah
					pesanan. Untuk pesanan baru, pindai QR di meja yang aktif.
				</div>
			{:else if !apiToken}
				<div class="bg-subtle border-line border-rice rounded-card mt-3 px-4 py-3 text-sm text-muted font-bold">
					Mode lihat saja — kode angka hanya untuk melihat. Pindai QR di meja untuk memesan dari
					perangkat ini.
				</div>
			{:else}
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => copySessionLink()}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
					>
						Salin link sesi ini
					</button>
					<span class="text-faint self-center text-xs">
						Untuk bayar: tunjukkan nomor order ke kasir — status tagihan ikut terpantau di atas.
					</span>
				</div>
			{/if}

			{#if cart.itemCount > 0 && dining.status === 'OPEN' && apiToken}
				<button
					type="button"
					onclick={() => cart.open()}
					class="bg-accent text-inverted border-rice rounded-btn rice-press mt-3 w-full px-4 py-2.5 text-sm font-bold"
				>
					Kirim keranjang ({cart.itemCount} item) ke meja {dining.tableNumber} →
				</button>
			{/if}

			<hr class="border-line border-rice my-4" />

			<div class="mb-6">
				<h3 class="font-display text-ink text-lg font-bold mb-3">Pilih Menu</h3>
				{#if menuLoading}
					<p class="text-muted text-sm font-bold">Memuat menu...</p>
				{:else if menuError}
					<p class="text-danger text-sm font-bold">{menuError}</p>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{#each menus as menu}
							<button
								type="button"
								onclick={() => { selectedMenu = menu; selectedQuantity = 1; selectedModifiers = {}; orderNotes = ''; showMenuModal = true; }}
								class="bg-shell border-line border-rice rounded-card p-3 text-left rice-lift"
							>
								<div class="aspect-square bg-subtle rounded-card mb-2 flex items-center justify-center overflow-hidden">
									{#if menu.imageUrls && menu.imageUrls.length > 0}
										<img src={menu.imageUrls[0]} alt={menu.name} class="h-full w-full object-cover rounded-card" />
									{:else}
										<span class="text-3xl">☕</span>
									{/if}
								</div>
								<h4 class="font-bold text-sm text-ink">{menu.name}</h4>
								<p class="text-xs text-muted font-mono">{formatPrice(menu.basePrice)}</p>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mb-6">
				<h3 class="font-display text-ink text-lg font-bold mb-3">Pesanan Anda</h3>
				{#if dining.orders.length === 0}
					<p class="text-muted text-sm font-bold">Belum ada pesanan. Pilih menu di atas!</p>
				{:else}
					<div class="space-y-3">
						{#each dining.orders as order}
							<div class="bg-shell border-line border-rice rounded-card p-3">
								<div class="flex justify-between items-center mb-1">
									<span class="font-mono text-ink font-bold text-sm">{order.orderNumber}</span>
									<span class="rounded-pill px-2 py-0.5 text-xs font-mono font-bold {orderStatusColor(order.status)}">
										{orderStatusLabel(order.status)}
									</span>
								</div>
								<span class="text-ink font-bold font-mono text-sm">{formatPrice(order.totalPrice)}</span>
								<p class="text-xs text-muted font-mono mb-2">
									{formatWibDateTime(order.createdAt)}
								</p>

								{#if order.items && order.items.length > 0}
									<div class="space-y-1.5 mt-2">
										{#each order.items as item}
											<div class="text-sm">
												<div class="flex justify-between text-ink">
													<span>{item.itemName} × {item.quantity}</span>
													<span class="font-mono">{formatPrice(item.subtotal)}</span>
												</div>
												{#if item.modifiers && item.modifiers.length > 0}
													<div class="flex flex-wrap gap-1 mt-0.5">
														{#each item.modifiers as mod}
															<span class="bg-subtle text-muted rounded-pill px-1.5 py-0.5 text-xs font-mono">
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
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<p class="text-muted text-sm font-bold">Tidak dapat memuat sesi.</p>
	</div>
{/if}

{#if showMenuModal && selectedMenu}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-overlay">
		<div class="bg-shell border-line border-rice rounded-card rounded-t-2xl sm:rounded-card w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
			<div class="p-4 border-b border-line border-rice">
				<div class="flex items-center justify-between">
					<h3 class="font-display text-ink text-xl font-bold">{selectedMenu.name}</h3>
					<button
						type="button"
						onclick={() => { showMenuModal = false; }}
						class="text-muted hover:text-ink"
					>
						<Icon name="close" class="h-5 w-5" />
					</button>
				</div>
				<p class="text-ink font-bold font-mono mt-1">{formatPrice(selectedMenu.basePrice)}</p>
				{#if selectedMenu.description}
					<p class="text-muted text-sm mt-1">{selectedMenu.description}</p>
				{/if}
			</div>

			<div class="p-4">
				<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs font-bold text-ink">
						Nama (opsional)
						<input
							type="text"
							bind:value={customerName}
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
				<div class="mb-4">
					<span class="block text-sm font-bold text-ink mb-1">Jumlah</span>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => selectedQuantity = Math.max(1, selectedQuantity - 1)}
							class="bg-subtle text-ink rounded-btn rice-press px-2 py-1"
						>
							-
						</button>
						<span class="font-mono text-lg text-ink w-8 text-center">{selectedQuantity}</span>
						<button
							type="button"
							onclick={() => selectedQuantity = selectedQuantity + 1}
							class="bg-subtle text-ink rounded-btn rice-press px-2 py-1"
						>
							+
						</button>
					</div>
				</div>

				{#if selectedMenu.modifierTypes && selectedMenu.modifierTypes.length > 0}
					<div class="space-y-4">
						{#each selectedMenu.modifierTypes as modType}
							<div>
								<span class="block text-sm font-bold text-ink mb-1">
									{modType.name}
									{#if modType.minSelection > 0}
										<span class="text-danger">*min {modType.minSelection}</span>
									{/if}
								</span>
								<div class="space-y-1">
									{#each modType.options as option}
										<div class="flex items-center gap-2">
											<input
												type="checkbox"
												id={`mod-${modType.id}-${option.id}`}
												checked={(selectedModifiers[modType.id] ?? []).includes(option.id)}
												onchange={(e) => toggleModifier(modType.id, option.id, modType.maxSelection, e.currentTarget.checked)}
												class="border-line rounded"
											/>
											<label for={`mod-${modType.id}-${option.id}`} class="text-sm text-ink flex-1">
												{option.name}
												{#if option.additionalPrice > 0}
													<span class="text-muted font-mono">(+{formatPrice(option.additionalPrice)})</span>
												{/if}
											</label>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="p-4 border-t border-line border-rice bg-subtle rounded-b-card">
				<button
					type="button"
					onclick={orderSingleItem}
					disabled={!apiToken || dining?.status === 'CLOSED'}
					class="bg-accent text-inverted border-rice rounded-btn rice-press w-full py-2 text-sm font-bold disabled:opacity-50"
				>
					Tambah ke Pesanan
				</button>
			</div>
		</div>
	</div>
{/if}

<CartDrawer mode="session" sessionActive={cartSessionActive} submitting={submittingCart} onSubmit={submitCart} />
