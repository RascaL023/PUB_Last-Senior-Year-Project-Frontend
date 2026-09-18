<script lang="ts">
	import { goto } from '$app/navigation';
	import { getApi } from '$lib/infrastructure/api/index';
	import { session } from '$lib/stores';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { DiningResponse, DiningListQuery } from '$lib/domain/dining';
	import type { PagedResult } from '$lib/core/types/pagination';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';

	const api = getApi();

	let diningList: DiningResponse[] = $state([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);
	let openTableId = $state<number | null>(null);

	const canOpen = session.hasAuthority('dining.create');
	const canClose = session.hasAuthority('dining.update');
	const canRead = session.hasAuthority('dining.read');

	async function loadDining() {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const query: DiningListQuery = { size: 50 };
			const result: PagedResult<DiningResponse> = await api.dinings.list(query);
			diningList = result.items;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function handleOpen() {
		if (!openTableId || !canOpen) return;
		try {
			await api.dinings.open({ tableId: openTableId });
			openTableId = null;
			await loadDining();
		} catch (e) {
			error = toAppError(e);
		}
	}

	async function handleClose(diningId: number) {
		if (!canClose) return;
		if (!confirm('Tutup meja ini?')) return;
		try {
			await api.dinings.close(diningId);
			await loadDining();
		} catch (e) {
			error = toAppError(e);
		}
	}
</script>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight mb-4">Manajemen Meja</h2>

	{#if error}
		<div class="bg-danger/10 border border-danger rounded-card px-4 py-3 text-sm text-ink mb-4">
			{error.message}
		</div>
	{/if}

	{#if canOpen}
		<div class="bg-shell border-line border-rice rounded-card p-4 mb-6">
			<h3 class="font-display text-ink text-base font-bold mb-3">Buka Meja Baru</h3>
			<div class="flex flex-wrap items-center gap-3">
				<select
					bind:value={openTableId}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value={null}>Pilih meja...</option>
					{#each diningList.filter(d => d.status === 'CLOSED') as dining}
						<option value={dining.tableId}>{dining.tableNumber}</option>
					{/each}
				</select>
				<button
					type="button"
					onclick={handleOpen}
					disabled={!openTableId}
					class="bg-accent text-inverted rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
				>
					Buka Meja
				</button>
			</div>
		</div>
	{/if}

	{#if canRead}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-line border-b border-rice">
						<th class="text-left py-3 px-4 text-muted font-mono font-bold">Meja</th>
						<th class="text-left py-3 px-4 text-muted font-mono font-bold">Status</th>
						<th class="text-left py-3 px-4 text-muted font-mono font-bold">Total</th>
						<th class="text-left py-3 px-4 text-muted font-mono font-bold">Tertutup</th>
						{#if canClose}
							<th class="text-right py-3 px-4 text-muted font-mono font-bold">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="6" class="py-8 text-center text-muted">Memuat...</td></tr>
					{:else if diningList.length === 0}
						<tr><td colspan="6" class="py-8 text-center text-muted">Tidak ada data meja</td></tr>
					{:else}
						{#each diningList as dining}
							<tr class="border-line border-b border-rice rice-lift">
								<td class="py-3 px-4 font-mono font-bold text-ink">{dining.tableNumber}</td>
								<td class="py-3 px-4">
									<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold
										{dining.status === 'OPEN' ? 'bg-sky text-inverted' : 'bg-leaf text-inverted'}">
										{dining.status}
									</span>
								</td>
								<td class="py-3 px-4 font-mono text-ink">{dining.totalPrice.toLocaleString('id-ID')}</td>
								<td class="py-3 px-4 text-muted">{dining.closedAt ?? '-'}</td>
								{#if canClose && dining.status === 'OPEN'}
									<td class="py-3 px-4 text-right">
										<button
											type="button"
											onclick={() => handleClose(dining.id)}
											class="bg-danger text-inverted rounded-btn rice-press px-3 py-1.5 text-xs font-bold"
										>
											Tutup
										</button>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}

	{#if !canRead}
		<div class="bg-subtle border-line border-rice rounded-card p-6 text-center">
			<Icon name="coffee" class="h-8 w-8 text-muted mx-auto mb-2" />
			<p class="text-muted text-sm font-bold">Anda tidak memiliki akses untuk melihat manajemen meja.</p>
		</div>
	{/if}
</section>

<style>
</style>