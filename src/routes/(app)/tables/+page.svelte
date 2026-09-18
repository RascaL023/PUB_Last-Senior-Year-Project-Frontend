<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { DiningTableResponse } from '$lib/domain/table';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let tables = $state<DiningTableResponse[]>([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);

	let newNumber = $state('');
	let editingId = $state<number | null>(null);
	let editNumber = $state('');

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));
	const canRead = $derived(can('table.read'));
	const canCreate = $derived(can('table.create'));
	const canUpdate = $derived(can('table.update'));
	const canDelete = $derived(can('table.delete'));

	async function loadTables() {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result = await api.tables.list({ size: 100, sort: 'tableNumber,asc' });
			tables = result.items;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		const number = newNumber.trim();
		if (!number) return;
		try {
			await api.tables.create({ tableNumber: number });
			toastStore.show(`Meja ${number} dibuat.`, 'success');
			newNumber = '';
			await loadTables();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function handleRename(table: DiningTableResponse) {
		const number = editNumber.trim();
		if (!number || number === table.tableNumber) {
			editingId = null;
			return;
		}
		try {
			await api.tables.update(table.id, { tableNumber: number });
			toastStore.show('Meja diperbarui.', 'success');
			editingId = null;
			await loadTables();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function handleDelete(table: DiningTableResponse) {
		if (!confirm(`Hapus meja ${table.tableNumber}?`)) return;
		try {
			await api.tables.remove(table.id);
			toastStore.show('Meja dihapus.', 'success');
			await loadTables();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	$effect(() => {
		if (canRead) void loadTables();
	});
</script>

<svelte:head>
	<title>Kelola Meja — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="table" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin mengelola meja.</p>
			</div>
		{:else}
			<h2 class="font-display text-ink mb-4 text-2xl font-extrabold tracking-tight">Kelola Meja</h2>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Meja"
						message={error.message}
						onRetry={() => loadTables()}
					/>
				</div>
			{/if}

			{#if canCreate}
				<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
					<label class="flex flex-1 flex-col gap-1 text-xs font-bold text-ink">
						Nomor meja baru
						<input
							type="text"
							bind:value={newNumber}
							maxlength="20"
							placeholder="cth. 12"
							onkeydown={(e) => e.key === 'Enter' && handleCreate()}
							class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
						/>
					</label>
					<button
						type="button"
						disabled={!newNumber.trim()}
						onclick={handleCreate}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
					>
						+ Meja
					</button>
				</div>
			{/if}

			{#if loading}
				<div class="text-muted py-12 text-center">Memuat meja...</div>
			{:else if tables.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="table" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada meja</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
					{#each tables as table (table.id)}
						<div class="bg-shell border-line border-rice rounded-card rice-lift p-3 text-center">
							{#if editingId === table.id}
								<input
									type="text"
									bind:value={editNumber}
									maxlength="20"
									onkeydown={(e) => {
										if (e.key === 'Enter') void handleRename(table);
										if (e.key === 'Escape') editingId = null;
									}}
									class="bg-subtle text-ink border-line border-rice rounded-btn mb-2 w-full px-2 py-1 text-center font-mono text-sm"
								/>
								<div class="flex justify-center gap-1">
									<button
										type="button"
										onclick={() => handleRename(table)}
										class="bg-accent text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
									>
										OK
									</button>
									<button
										type="button"
										onclick={() => (editingId = null)}
										class="bg-subtle text-muted rounded-btn rice-press px-2 py-1 text-xs font-bold"
									>
										Batal
									</button>
								</div>
							{:else}
								<span class="text-ink block font-mono text-lg font-bold">Meja {table.tableNumber}</span>
								<span class="rounded-pill mt-1 inline-block px-2 py-0.5 font-mono text-xs font-bold
									{table.status === 'AVAILABLE' ? 'bg-leaf text-inverted' : 'bg-ember text-inverted'}">
									{table.status === 'AVAILABLE' ? 'Kosong' : 'Terisi'}
								</span>
								<div class="mt-2 flex justify-center gap-1">
									{#if canUpdate}
										<button
											type="button"
											onclick={() => {
												editingId = table.id;
												editNumber = table.tableNumber;
											}}
											class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
										>
											Ubah
										</button>
									{/if}
									{#if canDelete}
										<button
											type="button"
											onclick={() => handleDelete(table)}
											class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
										>
											Hapus
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</section>
