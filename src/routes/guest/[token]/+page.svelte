<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { GuestDiningResponse, GuestOrderRequest } from '$lib/domain/guest-dining';
	import type { MenuResponse, MenuListQuery } from '$lib/domain/menu';
	import type { MenuCategoryResponse } from '$lib/domain/menu-category';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { params }: { params: { token: string } } = $props();
	const guestToken = $derived(params.token);
	const guestCode = $derived(atob(guestToken));

	const api = getApi();

	let dining = $state<GuestDiningResponse | null>(null);
	let loading = $state(true);
	let error: string | null = $state(null);
	let polling = $state(false);

	let menus = $state<MenuResponse[]>([]);
	let categories = $state<MenuCategoryResponse[]>([]);
	let menuLoading = $state(false);
	let menuError: string | null = $state(null);

	let selectedMenu: MenuResponse | null = $state(null);
	let selectedQuantity = $state(1);
	let selectedModifiers: Record<number, number> = $state({});
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

	async function loadDining() {
		try {
			polling = true;
			error = null;
			dining = await api.guestDinings.getByToken(guestToken);
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

	async function addToCart() {
		if (!selectedMenu) return;
		try {
			const items: GuestOrderRequest['items'] = [{
				menuId: selectedMenu.id,
				quantity: selectedQuantity,
				modifiers: Object.entries(selectedModifiers)
					.filter(([, v]) => v !== undefined)
					.map(([, v]) => ({ modifierOptionId: Number(v) }))
			}];

			await api.guestDinings.addOrder(guestToken, {
				items,
				customerName: '',
				notes: ''
			});
			toastStore.show('Pesanan ditambahkan!', 'success');
			selectedMenu = null;
			selectedQuantity = 1;
			selectedModifiers = {};
			showMenuModal = false;
			await loadDining();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function startPolling() {
		if (pollInterval) return;
		pollInterval = setInterval(() => {
			void loadDining();
		}, 7000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	$effect(() => {
		if (guestToken) {
			void loadDining();
			void loadMenus();
			void loadCategories();
			startPolling();
		}
	});

	onDestroy(() => stopPolling());
</script>

{#if loading}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<div class="text-center">
			<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Memuat sesi...</p>
		</div>
	</div>
{:else if error}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center max-w-md">
			<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
			<h2 class="font-display text-ink text-xl font-extrabold mb-2">Sesi Tidak Ditemukan</h2>
			<p class="text-muted text-sm font-bold mb-4">{error}</p>
			<button
				type="button"
				onclick={() => {
					window.location.href = '/guest';
				}}
				class="bg-accent text-inverted rounded-btn rice-press px-4 py-2 text-sm font-bold"
			>
				Kembali ke Beranda
			</button>
		</div>
	</div>
{:else if dining}
	<div class="bg-app text-ink min-h-screen pb-20">
		<div class="mx-auto max-w-4xl px-3 py-6 sm:px-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<span class="font-mono text-muted font-bold">Meja {dining.tableNumber}</span>
					<span class="rounded-pill bg-subtle text-muted px-2 py-0.5 text-xs font-mono">
						Kode: {guestCode}
					</span>
				</div>
				<span class="rounded-pill px-2 py-0.5 text-xs font-bold {invoiceStatusColor(dining.invoiceStatus)}">
					{invoiceStatusLabel(dining.invoiceStatus)}
				</span>
			</div>

			<h2 class="font-display text-ink text-2xl font-extrabold mb-2">
				Total: {formatPrice(dining.totalPrice)}
			</h2>
			<span class="text-sm text-muted font-bold {polling ? 'text-sky' : ''}">
				{polling ? '● Sedang memperbarui...' : '✓ Diperbarui'}
			</span>

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
								onclick={() => { selectedMenu = menu; selectedQuantity = 1; selectedModifiers = {}; showMenuModal = true; }}
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
									{new Date(order.createdAt).toLocaleString('id-ID')}
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
															<span class="bg-subtle text-muted rounded-pill px-1.5 py-0.25 text-xs font-mono">
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
												checked={selectedModifiers[modType.id] === option.id}
												onchange={(e) => {
													if (e.currentTarget.checked) {
														selectedModifiers[modType.id] = option.id;
													} else {
														delete selectedModifiers[modType.id];
													}
												}}
												class="rounded border-line text-accent"
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
					onclick={addToCart}
					class="bg-accent text-inverted border-rice rounded-btn rice-press w-full py-2 text-sm font-bold"
				>
					Tambah ke Pesanan
				</button>
			</div>
		</div>
	</div>
{/if}
