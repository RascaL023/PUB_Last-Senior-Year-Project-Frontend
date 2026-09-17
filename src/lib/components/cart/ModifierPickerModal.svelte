<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { MenuResponse } from '$lib/domain/menu';
	import { cart } from '$lib/stores';
	import { motionDuration } from '$lib/actions/reveal';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { menu }: { menu: MenuResponse } = $props();

	let selected = $state<Record<number, number[]>>({});
	let quantity = $state(1);
	let attempted = $state(false);

	const types = $derived(menu.modifierTypes ?? []);

	const extras = $derived(
		types.reduce((sum, type) => {
			const picked = selected[type.id] ?? [];
			return (
				sum +
				(type.options ?? [])
					.filter((opt) => picked.includes(opt.id))
					.reduce((s, opt) => s + opt.additionalPrice, 0)
			);
		}, 0)
	);

	const total = $derived((menu.basePrice + extras) * quantity);

	function missingTypes(): string[] {
		return types
			.filter((t) => {
				const count = (selected[t.id] ?? []).length;
				return count < t.minSelection || count > t.maxSelection;
			})
			.map((t) => t.name);
	}

	const valid = $derived(missingTypes().length === 0);

	function toggleOption(typeId: number, optionId: number, maxSelection: number): void {
		const current = selected[typeId] ?? [];
		if (maxSelection <= 1) {
			selected[typeId] = [optionId];
			return;
		}
		if (current.includes(optionId)) {
			selected[typeId] = current.filter((id) => id !== optionId);
		} else if (current.length < maxSelection) {
			selected[typeId] = [...current, optionId];
		}
	}

	function close(): void {
		cart.closePicker();
	}

	function confirm(): void {
		attempted = true;
		if (!valid) return;
		const flat = Object.values(selected).flat();
		cart.add(menu, flat, quantity);
		cart.closePicker();
		cart.open();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="bg-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
	transition:fade={{ duration: motionDuration(200) }}
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) close();
	}}
>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Pilih opsi {menu.name}"
		tabindex={-1}
		transition:fly={{ y: 32, duration: motionDuration(300) }}
		class="border-line bg-card rounded-card shadow-ricelg border-rice flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden"
	>
		<div class="border-linemuted flex items-start justify-between gap-3 border-b p-4">
			<div>
				<p class="text-accent font-mono text-xs font-bold tracking-[0.2em] uppercase">— Kustomisasi</p>
				<h2 class="text-ink font-display text-lg font-extrabold">{menu.name}</h2>
				<p class="text-muted font-mono text-xs">Rp {menu.basePrice.toLocaleString('id-ID')}</p>
			</div>
			<button
				type="button"
				onclick={close}
				aria-label="Tutup"
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-sm font-bold"
			>
				<Icon name="close" class="h-4 w-4" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4">
			{#if types.length === 0}
				<p class="text-muted text-sm">Menu ini tidak punya opsi tambahan.</p>
			{:else}
				{#each types as type (type.id)}
					<fieldset class="mb-4">
						<legend class="text-ink mb-1 text-sm font-bold">
							{type.name}
							{#if type.minSelection > 0}
								<span class="text-danger text-xs">*wajib pilih {type.minSelection}</span>
							{:else}
								<span class="text-faint text-xs">(opsional)</span>
							{/if}
						</legend>
						{#if attempted && ((selected[type.id] ?? []).length < type.minSelection || (selected[type.id] ?? []).length > type.maxSelection)}
							<p class="text-danger mb-2 text-xs">
								Pilih {type.minSelection}{type.maxSelection > type.minSelection ? `–${type.maxSelection}` : ''} opsi.
							</p>
						{/if}
						<div class="flex flex-wrap gap-2">
							{#each type.options ?? [] as opt (opt.id)}
								{@const active = (selected[type.id] ?? []).includes(opt.id)}
								<button
									type="button"
									aria-pressed={active}
									onclick={() => toggleOption(type.id, opt.id, type.maxSelection)}
									class="rounded-pill border-rice border-line rice-press px-3 py-1.5 text-xs font-bold {active
										? 'bg-accent text-inverted'
										: 'bg-subtle text-muted hover:text-ink'}"
								>
									{opt.name}{opt.additionalPrice > 0 ? ` +Rp${opt.additionalPrice.toLocaleString('id-ID')}` : ''}
								</button>
							{/each}
						</div>
					</fieldset>
				{/each}
			{/if}
		</div>

		<div class="border-linemuted flex items-center justify-between gap-3 border-t p-4">
			<div class="flex items-center gap-2" aria-label="Jumlah">
				<button
					type="button"
					onclick={() => (quantity = Math.max(1, quantity - 1))}
					disabled={quantity <= 1}
					aria-label="Kurangi"
					class="bg-subtle text-ink rounded-btn border-rice border-line rice-press w-9 py-1.5 font-bold disabled:opacity-40"
				>
					−
				</button>
				<span class="text-ink font-mono text-sm font-bold" aria-live="polite">{quantity}</span>
				<button
					type="button"
					onclick={() => (quantity = quantity + 1)}
					aria-label="Tambah"
					class="bg-subtle text-ink rounded-btn border-rice border-line rice-press w-9 py-1.5 font-bold"
				>
					+
				</button>
			</div>
			<button
				type="button"
				onclick={confirm}
				class="bg-accent text-inverted rounded-btn border-rice border-line rice-press flex-1 px-4 py-2.5 text-sm font-bold disabled:opacity-60"
			>
				Tambah · Rp {total.toLocaleString('id-ID')}
			</button>
		</div>
	</div>
</div>
