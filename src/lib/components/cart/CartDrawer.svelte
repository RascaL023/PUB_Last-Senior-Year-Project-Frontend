<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { cart, describeSelections } from '$lib/stores';
	import { motionDuration } from '$lib/actions/reveal';
	import MenuImage from '$lib/components/landing/MenuImage.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		// 'browse' (landing): tombol mengarah ke /guest, keranjang persist di localStorage.
		// 'session' (halaman sesi tamu): form nama/catatan + kirim via onSubmit.
		mode = 'browse',
		sessionActive = false,
		submitting = false,
		onSubmit = undefined
	}: {
		mode?: 'browse' | 'session';
		sessionActive?: boolean;
		submitting?: boolean;
		onSubmit?: (info: { customerName: string; notes: string }) => Promise<void> | void;
	} = $props();

	let checkoutName = $state('');
	let checkoutNotes = $state('');

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') cart.close();
	}

	function goToGuest(): void {
		cart.close();
		void goto('/guest');
	}

	async function handleSubmit(): Promise<void> {
		if (!onSubmit || submitting || !sessionActive || cart.isEmpty) return;
		await onSubmit({ customerName: checkoutName, notes: checkoutNotes });
		checkoutName = '';
		checkoutNotes = '';
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
									<Icon name="close" class="h-4 w-4" />
			</button>
		</div>

		{#if cart.isEmpty}
			<div class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
				<Icon name="cart" class="h-10 w-10" />
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
				<Icon name="close" class="h-4 w-4" />
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
				<p class="text-faint mb-3 text-[11px]">Harga final dihitung server saat pesanan masuk.</p>
				{#if mode === 'session'}
					<div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Nama (opsional)
							<input
								type="text"
								bind:value={checkoutName}
								maxlength="50"
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
							/>
						</label>
						<label class="flex flex-col gap-1 text-xs font-bold text-ink">
							Catatan (opsional)
							<input
								type="text"
								bind:value={checkoutNotes}
								maxlength="255"
								placeholder="cth. tanpa gula"
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
							/>
						</label>
					</div>
				{/if}
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => cart.clear()}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2.5 text-xs font-bold"
					>
						Kosongkan
					</button>
					{#if mode === 'session'}
						<button
							type="button"
							disabled={!sessionActive || submitting || cart.isEmpty}
							title={!sessionActive
								? 'Pindai QR di meja untuk mengirim (kode angka hanya untuk melihat)'
								: 'Kirim seluruh isi keranjang dalam 1 pesanan'}
							onclick={() => void handleSubmit()}
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press flex-1 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
						>
							{submitting ? 'Mengirim...' : `Kirim ${cart.itemCount} item ke meja`}
						</button>
					{:else}
						<button
							type="button"
							onclick={goToGuest}
							title="Keranjang tersimpan — pindai QR / masukkan kode meja untuk mengirimnya"
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press flex-1 px-4 py-2.5 text-sm font-bold"
						>
							Pesan ke Meja →
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
