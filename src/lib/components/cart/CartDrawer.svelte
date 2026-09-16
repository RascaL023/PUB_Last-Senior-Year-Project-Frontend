<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cart, describeSelections } from '$lib/stores';
	import { motionDuration } from '$lib/actions/reveal';
	import MenuImage from '$lib/components/landing/MenuImage.svelte';

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') cart.close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if cart.isOpen}
	<div
		class="bg-overlay fixed inset-0 z-50"
		transition:fade={{ duration: motionDuration(200) }}
		role="presentation"
		onclick={() => cart.close()}
	></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Keranjang belanja"
		tabindex={-1}
		transition:fly={{ x: 320, duration: motionDuration(300) }}
		class="border-line bg-card border-rice fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l"
	>
		<div class="border-linemuted flex items-center justify-between gap-3 border-b p-4">
			<div>
				<h2 class="text-ink font-display text-lg font-extrabold">Keranjang</h2>
				<p class="text-muted text-xs">{cart.itemCount} item</p>
			</div>
			<button
				type="button"
				onclick={() => cart.close()}
				aria-label="Tutup keranjang"
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-sm font-bold"
			>
				✕
			</button>
		</div>

		{#if cart.isEmpty}
			<div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
				<span class="text-4xl" aria-hidden="true">🧺</span>
				<p class="text-ink text-sm font-bold">Keranjang masih kosong</p>
				<p class="text-muted text-xs">Yuk pilih menu favoritmu dulu.</p>
				<button
					type="button"
					onclick={() => cart.close()}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press mt-2 px-4 py-2 text-xs font-bold"
				>
					Lihat menu
				</button>
			</div>
		{:else}
			<ul class="divide-linemuted flex-1 divide-y overflow-y-auto p-4">
				{#each cart.lines as line (line.key)}
					<li class="flex gap-3 py-3" transition:fade={{ duration: motionDuration(150) }}>
						<MenuImage src={line.image} alt={line.menuName} wrapperClass="h-16 w-16 flex-none rounded-btn" />
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<p class="text-ink truncate text-sm font-bold">{line.menuName}</p>
								<button
									type="button"
									onclick={() => cart.remove(line.key)}
									aria-label="Hapus {line.menuName}"
									class="text-faint hover:text-danger px-1 text-sm font-bold"
								>
									✕
								</button>
							</div>
							{#if line.selections.length > 0}
								<p class="text-muted truncate text-xs">{describeSelections(line)}</p>
							{/if}
							<div class="mt-1.5 flex items-center justify-between gap-2">
								<div class="flex items-center gap-1.5">
									<button
										type="button"
										onclick={() => cart.setQuantity(line.key, line.quantity - 1)}
										aria-label="Kurangi {line.menuName}"
										class="bg-subtle text-ink rounded-btn border-rice border-line rice-press w-7 py-0.5 text-sm font-bold"
									>
										−
									</button>
									<span class="text-ink font-mono text-xs font-bold">{line.quantity}</span>
									<button
										type="button"
										onclick={() => cart.setQuantity(line.key, line.quantity + 1)}
										aria-label="Tambah {line.menuName}"
										class="bg-subtle text-ink rounded-btn border-rice border-line rice-press w-7 py-0.5 text-sm font-bold"
									>
										+
									</button>
								</div>
								<span class="text-ink font-mono text-sm font-bold">
									Rp {(line.unitTotal * line.quantity).toLocaleString('id-ID')}
								</span>
							</div>
						</div>
					</li>
				{/each}
			</ul>

			<div class="border-linemuted border-t p-4">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-muted text-sm">Subtotal</span>
					<span class="text-ink font-mono text-base font-extrabold">
						Rp {cart.subtotal.toLocaleString('id-ID')}
					</span>
				</div>
				<p class="text-faint mb-3 text-[11px]">Harga final dihitung kasir saat checkout.</p>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => cart.clear()}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2.5 text-xs font-bold"
					>
						Kosongkan
					</button>
					<button
						type="button"
						disabled
						title="Checkout dibuka setelah endpoint tamu BE siap"
						class="bg-accent text-inverted rounded-btn border-rice border-line flex-1 cursor-not-allowed px-4 py-2.5 text-sm font-bold opacity-60"
					>
						Checkout · segera
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
