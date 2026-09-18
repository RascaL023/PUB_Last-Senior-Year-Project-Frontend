<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { MenuCategoryResponse } from '$lib/domain/menu-category';
	import type { ModifierTypeResponse } from '$lib/domain/modifier';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let tab = $state<'categories' | 'modifiers'>('categories');

	let categories = $state<MenuCategoryResponse[]>([]);
	let catLoading = $state(false);
	let catError: AppError | null = $state(null);
	let catEditingId = $state<number | null>(null);
	let catName = $state('');
	let catCode = $state('');
	let catOrder = $state(0);

	let modifiers = $state<ModifierTypeResponse[]>([]);
	let modLoading = $state(false);
	let modError: AppError | null = $state(null);
	let modEditingId = $state<number | null>(null);
	let modName = $state('');
	let modMin = $state(1);
	let modMax = $state(1);
	let modOptions = $state<{ id?: number; name: string; additionalPrice: number }[]>([]);

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));
	const canCatRead = $derived(can('menu-category.read'));
	const canCatWrite = $derived(can('menu-category.create') || can('menu-category.update'));
	const canCatDelete = $derived(can('menu-category.delete'));
	const canModRead = $derived(can('menu-modifier.read'));
	const canModWrite = $derived(can('menu-modifier.create') || can('menu-modifier.update'));
	const canModDelete = $derived(can('menu-modifier.delete'));

	async function loadCategories() {
		if (!canCatRead) return;
		catLoading = true;
		catError = null;
		try {
			const result = await api.categories.list({ size: 100, sort: 'displayName,asc' });
			categories = result.items;
		} catch (e) {
			catError = toAppError(e);
		} finally {
			catLoading = false;
		}
	}

	async function loadModifiers() {
		if (!canModRead) return;
		modLoading = true;
		modError = null;
		try {
			const result = await api.modifiers.list({ size: 100, sort: 'name,asc' });
			modifiers = result.items;
		} catch (e) {
			modError = toAppError(e);
		} finally {
			modLoading = false;
		}
	}

	function resetCatForm() {
		catEditingId = null;
		catName = '';
		catCode = '';
		catOrder = 0;
	}

	async function saveCategory() {
		const payload = {
			displayName: catName.trim(),
			categoryCode: catCode.trim().toLowerCase(),
			displayOrder: catOrder
		};
		if (payload.displayName.length < 3 || payload.categoryCode.length < 3) {
			toastStore.show('Nama dan kode minimal 3 karakter.', 'warning');
			return;
		}
		try {
			if (catEditingId !== null) {
				await api.categories.update(catEditingId, payload);
				toastStore.show('Kategori diperbarui.', 'success');
			} else {
				await api.categories.create(payload);
				toastStore.show('Kategori dibuat.', 'success');
			}
			resetCatForm();
			await loadCategories();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function deleteCategory(id: number, name: string) {
		if (!confirm(`Hapus kategori "${name}"?`)) return;
		try {
			await api.categories.remove(id);
			toastStore.show('Kategori dihapus.', 'success');
			await loadCategories();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function restoreCategory(id: number) {
		try {
			await api.categories.restore(id);
			toastStore.show('Kategori dipulihkan.', 'success');
			await loadCategories();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function resetModForm() {
		modEditingId = null;
		modName = '';
		modMin = 1;
		modMax = 1;
		modOptions = [{ name: '', additionalPrice: 0 }];
	}

	async function saveModifier() {
		const options = modOptions
			.filter((o) => o.name.trim().length > 0)
			.map((o) => ({
				...(o.id !== undefined ? { id: o.id } : {}),
				name: o.name.trim(),
				additionalPrice: Math.max(0, o.additionalPrice)
			}));
		if (modName.trim().length < 3 || options.length === 0) {
			toastStore.show('Nama minimal 3 karakter dan minimal 1 opsi.', 'warning');
			return;
		}
		try {
			const payload = {
				name: modName.trim(),
				minSelection: Math.max(0, modMin),
				maxSelection: Math.max(modMin, modMax),
				options
			};
			if (modEditingId !== null) {
				await api.modifiers.update(modEditingId, payload);
				toastStore.show('Modifier diperbarui.', 'success');
			} else {
				await api.modifiers.create(payload);
				toastStore.show('Modifier dibuat.', 'success');
			}
			resetModForm();
			await loadModifiers();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function deleteModifier(id: number, name: string) {
		if (!confirm(`Hapus modifier "${name}"? (hard delete)`)) return;
		try {
			await api.modifiers.remove(id);
			toastStore.show('Modifier dihapus.', 'success');
			await loadModifiers();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function editModifier(m: ModifierTypeResponse) {
		modEditingId = m.id;
		modName = m.name;
		modMin = m.minSelection;
		modMax = m.maxSelection;
		modOptions = m.options.map((o) => ({ id: o.id, name: o.name, additionalPrice: o.additionalPrice }));
	}

	$effect(() => {
		if (tab === 'categories') void loadCategories();
		else void loadModifiers();
	});

	resetModForm();
</script>

<svelte:head>
	<title>Katalog — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		<h2 class="font-display text-ink mb-4 text-2xl font-extrabold tracking-tight">Katalog</h2>

		<div class="mb-4 flex gap-2">
			<button
				type="button"
				onclick={() => (tab = 'categories')}
				class="rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold
					{tab === 'categories' ? 'bg-accent text-inverted' : 'bg-subtle text-muted hover:text-ink'}"
			>
				Kategori
			</button>
			<button
				type="button"
				onclick={() => (tab = 'modifiers')}
				class="rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold
					{tab === 'modifiers' ? 'bg-accent text-inverted' : 'bg-subtle text-muted hover:text-ink'}"
			>
				Modifier
			</button>
		</div>

		{#if tab === 'categories'}
			{#if !canCatRead}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat kategori.</p>
				</div>
			{:else}
				{#if catError}
					<div class="mb-4">
						<ErrorState
							code={catError.status}
							title="Gagal Memuat Kategori"
							message={catError.message}
							onRetry={() => loadCategories()}
						/>
					</div>
				{/if}
				{#if canCatWrite}
					<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
						<h3 class="font-display text-ink mb-3 text-base font-bold">
							{catEditingId !== null ? 'Ubah Kategori' : 'Kategori Baru'}
						</h3>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Nama tampil
								<input
									type="text"
									bind:value={catName}
									maxlength="30"
									placeholder="cth. Hot Drinks"
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Kode slug
								<input
									type="text"
									bind:value={catCode}
									maxlength="30"
									placeholder="cth. hot-drinks"
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Urutan
								<input
									type="number"
									min="0"
									bind:value={catOrder}
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={saveCategory}
								class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
							>
								Simpan
							</button>
							{#if catEditingId !== null}
								<button
									type="button"
									onclick={resetCatForm}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
								>
									Batal
								</button>
							{/if}
						</div>
					</div>
				{/if}
				{#if catLoading}
					<div class="text-muted py-12 text-center">Memuat kategori...</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-line border-rice border-b">
									<th class="text-muted px-4 py-3 text-left font-mono font-bold">Nama</th>
									<th class="text-muted px-4 py-3 text-left font-mono font-bold">Kode</th>
									<th class="text-muted px-4 py-3 text-right font-mono font-bold">Urutan</th>
									<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#each categories as cat (cat.id)}
									<tr class="border-line border-rice border-b">
										<td class="text-ink px-4 py-3 font-bold">{cat.name}</td>
										<td class="text-muted px-4 py-3 font-mono text-xs">{cat.categoryCode}</td>
										<td class="text-ink px-4 py-3 text-right font-mono">{cat.displayOrder}</td>
										<td class="px-4 py-3 text-right">
											<div class="flex justify-end gap-2">
												{#if canCatWrite}
													<button
														type="button"
														onclick={() => {
															catEditingId = cat.id;
															catName = cat.name;
															catCode = cat.categoryCode;
															catOrder = cat.displayOrder;
														}}
														class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
													>
														Ubah
													</button>
													<button
														type="button"
														onclick={() => restoreCategory(cat.id)}
														class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
													>
														Pulihkan
													</button>
												{/if}
												{#if canCatDelete}
													<button
														type="button"
														onclick={() => deleteCategory(cat.id, cat.name)}
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
				{/if}
			{/if}
		{:else}
			{#if !canModRead}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat modifier.</p>
				</div>
			{:else}
				{#if modError}
					<div class="mb-4">
						<ErrorState
							code={modError.status}
							title="Gagal Memuat Modifier"
							message={modError.message}
							onRetry={() => loadModifiers()}
						/>
					</div>
				{/if}
				{#if canModWrite}
					<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
						<h3 class="font-display text-ink mb-3 text-base font-bold">
							{modEditingId !== null ? 'Ubah Modifier' : 'Modifier Baru'}
						</h3>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Nama tipe
								<input
									type="text"
									bind:value={modName}
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Min pilih
								<input
									type="number"
									min="0"
									bind:value={modMin}
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
								/>
							</label>
							<label class="flex flex-col gap-1 text-xs font-bold text-ink">
								Maks pilih
								<input
									type="number"
									min="1"
									bind:value={modMax}
									class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
								/>
							</label>
						</div>
						<p class="text-ink mt-3 mb-1 text-xs font-bold">Opsi</p>
						{#each modOptions as opt, i}
							<div class="mb-2 flex gap-2">
								<input
									type="text"
									bind:value={modOptions[i].name}
									placeholder="Nama opsi"
									class="bg-subtle text-ink border-line border-rice rounded-btn flex-1 px-3 py-2 text-sm outline-none placeholder:text-faint"
								/>
								<input
									type="number"
									min="0"
									bind:value={modOptions[i].additionalPrice}
									placeholder="+Rp"
									class="bg-subtle text-ink border-line border-rice rounded-btn w-28 px-3 py-2 text-sm"
								/>
								{#if modOptions.length > 1}
									<button
										type="button"
										onclick={() => (modOptions = modOptions.filter((_, idx) => idx !== i))}
										class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
									>
										×
									</button>
								{/if}
							</div>
						{/each}
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={() => (modOptions = [...modOptions, { name: '', additionalPrice: 0 }])}
								class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
							>
								+ Opsi
							</button>
							<button
								type="button"
								onclick={saveModifier}
								class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
							>
								Simpan
							</button>
							{#if modEditingId !== null}
								<button
									type="button"
									onclick={resetModForm}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
								>
									Batal
								</button>
							{/if}
						</div>
					</div>
				{/if}
				{#if modLoading}
					<div class="text-muted py-12 text-center">Memuat modifier...</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each modifiers as mod (mod.id)}
							<div class="bg-shell border-line border-rice rounded-card p-4">
								<div class="mb-2 flex items-center justify-between gap-2">
									<h4 class="text-ink font-bold">{mod.name}</h4>
									<span class="text-muted font-mono text-xs">min {mod.minSelection} · maks {mod.maxSelection}</span>
								</div>
								<div class="mb-3 flex flex-wrap gap-1">
									{#each mod.options as opt}
										<span class="bg-subtle text-muted rounded-pill px-2 py-0.5 font-mono text-xs">
											{opt.name}{opt.additionalPrice > 0 ? ` (+${opt.additionalPrice.toLocaleString('id-ID')})` : ''}
										</span>
									{/each}
								</div>
								<div class="flex gap-2">
									{#if canModWrite}
										<button
											type="button"
											onclick={() => editModifier(mod)}
											class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
										>
											Ubah
										</button>
									{/if}
									{#if canModDelete}
										<button
											type="button"
											onclick={() => deleteModifier(mod.id, mod.name)}
											class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
										>
											Hapus
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</section>
