<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { CustomerResponse } from '$lib/domain/customer';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let customers = $state<CustomerResponse[]>([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);
	let keyword = $state('');

	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let formName = $state('');
	let formEmail = $state('');
	let formPhone = $state('');
	let formNotes = $state('');
	let saving = $state(false);

	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));
	const canRead = $derived(can('customer.read'));
	const canCreate = $derived(can('customer.create'));
	const canUpdate = $derived(can('customer.update'));
	const canDelete = $derived(can('customer.delete') || can('customer.*'));

	async function loadCustomers(page = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const result: PagedResult<CustomerResponse> = await api.customers.list({
				page,
				size: 20,
				keyword: keyword.trim() || undefined,
				sort: 'createdAt,desc'
			});
			customers = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editingId = null;
		formName = '';
		formEmail = '';
		formPhone = '';
		formNotes = '';
		showForm = true;
	}

	function openEdit(c: CustomerResponse) {
		editingId = c.id;
		formName = c.name;
		formEmail = c.email ?? '';
		formPhone = c.phone ?? '';
		formNotes = c.notes ?? '';
		showForm = true;
	}

	function valid(): boolean {
		if (formName.trim().length < 2) return false;
		if (formEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) return false;
		if (formPhone.trim() && !/^[+0-9][0-9\s-]{5,19}$/.test(formPhone.trim())) return false;
		return true;
	}

	async function handleSave() {
		if (!valid() || saving) return;
		saving = true;
		try {
			const payload = {
				name: formName.trim(),
				email: formEmail.trim() || undefined,
				phone: formPhone.trim() || undefined,
				notes: formNotes.trim() || undefined
			};
			if (editingId !== null) {
				await api.customers.update(editingId, payload);
				toastStore.show('Member diperbarui.', 'success');
			} else {
				await api.customers.create(payload);
				toastStore.show('Member dibuat.', 'success');
			}
			showForm = false;
			await loadCustomers(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			saving = false;
		}
	}

	async function handleDelete(c: CustomerResponse) {
		if (!confirm(`Hapus member "${c.name}"? Akun login tidak ikut terhapus.`)) return;
		try {
			await api.customers.remove(c.id);
			toastStore.show('Member dihapus.', 'success');
			await loadCustomers(currentPage - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function handlePage(delta: number) {
		const target = currentPage + delta;
		if (target < 1 || target > totalPages) return;
		void loadCustomers(target - 1);
	}

	$effect(() => {
		if (canRead) void loadCustomers(0);
	});
</script>

<svelte:head>
	<title>Pelanggan — Hysteria Cafe</title>
</svelte:head>

<section class="app-main bg-app text-ink px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="user" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat member.</p>
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between gap-2">
				<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Pelanggan</h2>
				{#if canCreate}
					<button
						type="button"
						onclick={openCreate}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
					>
						+ Member
					</button>
				{/if}
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Member"
						message={error.message}
						onRetry={() => loadCustomers(currentPage - 1)}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
				<input
					type="text"
					placeholder="Cari nama / email / telepon..."
					bind:value={keyword}
					onkeydown={(e) => e.key === 'Enter' && loadCustomers(0)}
					class="bg-subtle text-ink border-line border-rice rounded-btn w-full px-3 py-2 text-sm font-bold"
				/>
			</div>

			{#if showForm && (canCreate || canUpdate)}
				<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
					<h3 class="font-display text-ink mb-3 text-base font-bold">
						{editingId !== null ? 'Ubah Member' : 'Member Baru'}
					</h3>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Nama (min 2)
							<input
								type="text"
								bind:value={formName}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Email (opsional)
							<input
								type="email"
								bind:value={formEmail}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Telepon (opsional)
							<input
								type="tel"
								bind:value={formPhone}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Catatan (opsional)
							<input
								type="text"
								bind:value={formNotes}
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
							/>
						</label>
					</div>
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							disabled={!valid() || saving}
							onclick={handleSave}
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
						>
							{saving ? 'Menyimpan...' : 'Simpan'}
						</button>
						<button
							type="button"
							onclick={() => (showForm = false)}
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
						>
							Batal
						</button>
					</div>
				</div>
			{/if}

			{#if loading}
				<div class="text-muted py-12 text-center">Memuat member...</div>
			{:else if customers.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="user" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada member</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Nama</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Email</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Telepon</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Akun</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each customers as c (c.id)}
								<tr class="border-line border-rice border-b">
									<td class="text-ink px-4 py-3 font-bold">{c.name}</td>
									<td class="text-muted px-4 py-3 font-mono text-xs">{c.email ?? '-'}</td>
									<td class="text-muted px-4 py-3 font-mono text-xs">{c.phone ?? '-'}</td>
									<td class="px-4 py-3">
										<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold
											{c.userAuthId ? 'bg-leaf text-inverted' : 'bg-subtle text-muted'}">
											{c.userAuthId ? 'Punya' : '-'}
										</span>
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex justify-end gap-2">
											{#if canUpdate}
												<button
													type="button"
													onclick={() => openEdit(c)}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
												>
													Ubah
												</button>
											{/if}
											{#if canDelete}
												<button
													type="button"
													onclick={() => handleDelete(c)}
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
