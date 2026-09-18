<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { uploadToImageKit } from '$lib/infrastructure/imagekit/upload';
	import type { AdminMenuListQuery, MenuResponse } from '$lib/domain/menu';
	import type { MenuCategoryResponse } from '$lib/domain/menu-category';
	import type { ModifierTypeResponse } from '$lib/domain/modifier';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let menus = $state<MenuResponse[]>([]);
	let categories = $state<MenuCategoryResponse[]>([]);
	let modifierTypes = $state<ModifierTypeResponse[]>([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);

	let filterName = $state('');
	let filterCategory = $state<number | ''>('');
	let filterAvailable = $state<'' | 'true' | 'false'>('');
	let filterDeleted = $state<'active' | 'deleted' | 'all'>('active');

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let formName = $state('');
	let formDescription = $state('');
	let formPrice = $state<number | null>(null);
	let formAvailable = $state(true);
	let formCategoryIds = $state<number[]>([]);
	let formModifierIds = $state<number[]>([]);
	let formImages = $state<string[]>([]);
	let uploading = $state(false);
	let saving = $state(false);

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));
	const canRead = $derived(can('menu.read'));
	const canCreate = $derived(can('menu.create'));
	const canUpdate = $derived(can('menu.update'));
	const canDelete = $derived(can('menu.delete'));
	const canUpload = $derived(can('image.create'));

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	async function loadMenus(page = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const query: AdminMenuListQuery = {
				page,
				size: 20,
				sort: 'name,asc',
				deleted: filterDeleted
			};
			if (filterName.trim()) query.name = filterName.trim();
			if (filterCategory !== '') query.categoryId = filterCategory;
			if (filterAvailable !== '') query.isAvailable = filterAvailable === 'true';
			const result: PagedResult<MenuResponse> = await api.adminMenus.search(query);
			menus = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function loadRefs() {
		try {
			const [cats, mods] = await Promise.all([
				api.categories.list({ size: 100 }),
				api.modifiers.list({ size: 100 })
			]);
			categories = cats.items;
			modifierTypes = mods.items;
		} catch {
			// opsi form boleh kosong; list utama tetap jalan
		}
	}

	function openCreate() {
		editingId = null;
		formName = '';
		formDescription = '';
		formPrice = null;
		formAvailable = true;
		formCategoryIds = [];
		formModifierIds = [];
		formImages = [];
		showForm = true;
	}

	function openEdit(menu: MenuResponse) {
		editingId = menu.id;
		formName = menu.name;
		formDescription = menu.description ?? '';
		formPrice = menu.basePrice;
		formAvailable = menu.isAvailable;
		formCategoryIds = menu.categories.map((c) => c.id);
		formModifierIds = menu.modifierTypes.map((m) => m.id);
		formImages = [...menu.imageUrls];
		showForm = true;
	}

	function toggleId(list: number[], id: number): number[] {
		return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
	}

	async function handleFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		uploading = true;
		try {
			const auth = await api.images.getUploadAuth();
			if (!auth) throw new Error('Gagal meminta kredensial upload');
			const uploaded = await uploadToImageKit(auth, file);
			formImages = [...formImages, uploaded.url];
			toastStore.show('Gambar terunggah.', 'success');
		} catch (err) {
			toastStore.show(toAppError(err).message, 'error');
		} finally {
			uploading = false;
		}
	}

	function valid(): boolean {
		const name = formName.trim();
		if (name.length < 3 || name.length > 30) return false;
		if (formCategoryIds.length === 0) return false;
		if (formPrice === null || formPrice < 500) return false;
		return true;
	}

	async function handleSave() {
		if (!valid() || saving) return;
		if (editingId !== null && !canUpdate) return;
		if (editingId === null && !canCreate) return;
		saving = true;
		try {
			const payload = {
				name: formName.trim(),
				categoryIds: formCategoryIds,
				description: formDescription.trim() || undefined,
				imageUrls: formImages.length > 0 ? formImages : undefined,
				basePrice: formPrice as number,
				isAvailable: formAvailable,
				ModifierTypeIds: formModifierIds.length > 0 ? formModifierIds : undefined
			};
			if (editingId !== null) {
				await api.menus.update(editingId, payload);
				toastStore.show('Menu diperbarui.', 'success');
			} else {
				await api.menus.create(payload);
				toastStore.show('Menu dibuat.', 'success');
			}
			showForm = false;
			await loadMenus(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			saving = false;
		}
	}

	async function handleDelete(menu: MenuResponse) {
		if (!canDelete) return;
		if (!confirm(`Hapus menu "${menu.name}"?`)) return;
		try {
			await api.menus.remove(menu.id);
			toastStore.show('Menu dihapus.', 'success');
			await loadMenus(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function handleRestore(menu: MenuResponse) {
		if (!canUpdate) return;
		try {
			await api.menus.restore(menu.id);
			toastStore.show('Menu dipulihkan.', 'success');
			await loadMenus(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function handlePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		void loadMenus(target - 1);
	}

	$effect(() => {
		if (canRead) {
			void loadMenus(0);
			void loadRefs();
		}
	});
</script>

<svelte:head>
	<title>Kelola Menu — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin mengelola menu.</p>
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between gap-2">
				<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Kelola Menu</h2>
				{#if canCreate}
					<button
						type="button"
						onclick={openCreate}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
					>
						+ Menu
					</button>
				{/if}
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Menu"
						message={error.message}
						onRetry={() => loadMenus(currentPage - 1)}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap">
				<input
					type="text"
					placeholder="Cari menu..."
					bind:value={filterName}
					onkeydown={(e) => e.key === 'Enter' && loadMenus(0)}
					class="bg-subtle text-ink border-line border-rice rounded-btn flex-1 px-3 py-2 text-sm font-bold"
				/>
				<select
					bind:value={filterCategory}
					onchange={() => loadMenus(0)}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Kategori</option>
					{#each categories as cat (cat.id)}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
				<select
					bind:value={filterAvailable}
					onchange={() => loadMenus(0)}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Status</option>
					<option value="true">Tersedia</option>
					<option value="false">Tidak tersedia</option>
				</select>
				<select
					bind:value={filterDeleted}
					onchange={() => loadMenus(0)}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="active">Aktif</option>
					<option value="deleted">Terhapus</option>
					<option value="all">Semua</option>
				</select>
			</div>

			{#if showForm && (canCreate || canUpdate)}
				<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
					<h3 class="font-display text-ink mb-3 text-base font-bold">
						{editingId !== null ? 'Ubah Menu' : 'Menu Baru'}
					</h3>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Nama (3–30 karakter)
							<input
								type="text"
								bind:value={formName}
								maxlength="30"
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Harga dasar (min 500)
							<input
								type="number"
								min="500"
								bind:value={formPrice}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink sm:col-span-2">
							Deskripsi
							<input
								type="text"
								bind:value={formDescription}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
					</div>
					<p class="text-ink mt-3 mb-1 text-xs font-bold">Kategori (wajib ≥ 1)</p>
					<div class="mb-2 flex flex-wrap gap-1">
						{#each categories as cat (cat.id)}
							<button
								type="button"
								onclick={() => (formCategoryIds = toggleId(formCategoryIds, cat.id))}
								class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs font-bold
									{formCategoryIds.includes(cat.id) ? 'bg-accent text-inverted' : 'bg-subtle text-muted'}"
							>
								{cat.name}
							</button>
						{/each}
					</div>
					<p class="text-ink mt-3 mb-1 text-xs font-bold">Tipe modifier (opsional)</p>
					<div class="mb-2 flex flex-wrap gap-1">
						{#each modifierTypes as mod (mod.id)}
							<button
								type="button"
								onclick={() => (formModifierIds = toggleId(formModifierIds, mod.id))}
								class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs font-bold
									{formModifierIds.includes(mod.id) ? 'bg-accent text-inverted' : 'bg-subtle text-muted'}"
							>
								{mod.name}
							</button>
						{/each}
					</div>
					<label class="mt-2 flex items-center gap-2 text-xs font-bold text-ink">
						<input type="checkbox" bind:checked={formAvailable} class="h-4 w-4 accent-current" />
						Tersedia untuk dipesan
					</label>
					<p class="text-ink mt-3 mb-1 text-xs font-bold">Gambar</p>
					{#if formImages.length > 0}
						<div class="mb-2 flex flex-wrap gap-2">
							{#each formImages as url, i}
								<div class="relative">
									<img src={url} alt="menu" class="bg-subtle rounded-btn h-16 w-16 object-cover" />
									<button
										type="button"
										aria-label="Hapus gambar"
										onclick={() => (formImages = formImages.filter((_, idx) => idx !== i))}
										class="bg-danger text-inverted rounded-pill absolute -top-1 -right-1 px-1.5 text-[10px] font-bold"
									>
										×
									</button>
								</div>
							{/each}
						</div>
					{/if}
					{#if canUpload}
						<label class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press inline-block cursor-pointer px-3 py-2 text-xs font-bold">
							{uploading ? 'Mengunggah...' : '+ Unggah gambar'}
							<input type="file" accept="image/*" class="hidden" onchange={handleFile} disabled={uploading} />
						</label>
					{:else}
						<p class="text-faint font-mono text-xs">Unggah gambar khusus ADMIN.</p>
					{/if}
					<div class="mt-4 flex gap-2">
						<button
							type="button"
							disabled={!valid() || saving}
							onclick={handleSave}
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
						>
							{saving ? 'Menyimpan...' : 'Simpan'}
						</button>
						<button
							type="button"
							onclick={() => (showForm = false)}
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
						>
							Batal
						</button>
					</div>
				</div>
			{/if}

			{#if loading}
				<div class="text-muted py-12 text-center">Memuat menu...</div>
			{:else if menus.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada menu</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Nama</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Kategori</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Harga</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Status</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each menus as menu (menu.id)}
								<tr class="border-line border-rice border-b">
									<td class="text-ink px-4 py-3 font-bold">
										{menu.name}
										{#if menu.deletedAt}
											<span class="rounded-pill bg-danger text-inverted ml-2 px-2 py-0.5 font-mono text-[10px] font-bold">terhapus</span>
										{/if}
									</td>
									<td class="text-muted px-4 py-3 text-xs">{menu.categories.map((c) => c.name).join(', ')}</td>
									<td class="text-ink px-4 py-3 text-right font-mono">{formatPrice(menu.basePrice)}</td>
									<td class="px-4 py-3">
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold
											{menu.isAvailable ? 'bg-leaf text-inverted' : 'bg-honey text-ink'}">
											{menu.isAvailable ? 'Tersedia' : 'Habis'}
										</span>
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex justify-end gap-2">
											{#if canUpdate && !menu.deletedAt}
												<button
													type="button"
													onclick={() => openEdit(menu)}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
												>
													Ubah
												</button>
											{/if}
											{#if canUpdate && menu.deletedAt}
												<button
													type="button"
													onclick={() => handleRestore(menu)}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
												>
													Pulihkan
												</button>
											{/if}
											{#if canDelete && !menu.deletedAt}
												<button
													type="button"
													onclick={() => handleDelete(menu)}
													class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
												>
													Hapus
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
