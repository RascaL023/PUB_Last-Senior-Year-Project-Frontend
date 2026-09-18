<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { cart } from '$lib/stores';

	const api = getApi();

	let guestCode = $state('');
	let trackToken = $state('');
	let loading = $state(false);

	async function handleLookup(): Promise<void> {
		const code = guestCode.trim();
		if (!code) return;
		loading = true;
		try {
			const dining = await api.guestDinings.getByCode(code);
			if (dining) {
				goto(`/guest/${btoa(code)}`);
			} else {
				toastStore.show('Sesi tidak ditemukan atau sudah selesai.', 'error');
			}
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			loading = false;
		}
	}

	function handleKeypad(num: string): void {
		if (guestCode.length < 6) {
			guestCode += num;
		}
	}

	function handleBackspace(): void {
		guestCode = guestCode.slice(0, -1);
	}

	function handleClear(): void {
		guestCode = '';
	}

	function handleTrack(): void {
		const token = trackToken.trim();
		if (token) goto(`/guest/track/${token}`);
	}

	$effect(() => {
		const token = page.url.searchParams.get('t') ?? page.url.searchParams.get('token');
		if (token) goto(`/guest/${encodeURIComponent(token)}`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Kode Meja — Hysteria Cafe</title>
</svelte:head>

<div class="bg-app text-ink min-h-screen flex items-center justify-center px-3 py-8">
	<div class="mx-auto max-w-md w-full">
		<div class="text-center mb-8">
			<Icon name="info" class="h-12 w-12 text-accent mx-auto mb-3" />
			<h1 class="font-display text-ink text-3xl font-extrabold mb-2">Hysteria Cafe</h1>
			<p class="text-muted text-sm font-bold">
				Punya kode meja 6 digit? Masukkan untuk <span class="text-ink">melihat</span> pesanan.
				Untuk <span class="text-ink">memesan</span>, pindai QR di meja. Punya token takeaway? Lacak di bawah.
			</p>
		</div>

		<div class="bg-shell border-line border-rice rounded-card p-6">
			{#if cart.itemCount > 0}
				<div class="bg-subtle border-line border-rice rounded-btn mb-4 px-4 py-3 text-center text-sm text-ink font-bold">
					Keranjangmu tersimpan ({cart.itemCount} item) — masukkan kode meja di bawah untuk mengirimnya.
				</div>
			{/if}
			<div class="mb-4">
				<div class="bg-subtle border-line border-rice rounded-btn px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] text-ink min-h-[3rem] flex items-center justify-center">
					{#if guestCode}
						{guestCode.replace(/./g, '*')}
					{:else}
						<span class="text-faint">______</span>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2 mb-4">
				<button
					type="button"
					onclick={() => handleKeypad('1')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					1
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('2')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					2
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('3')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					3
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('4')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					4
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('5')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					5
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('6')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					6
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('7')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					7
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('8')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					8
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('9')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					9
				</button>
				<button
					type="button"
					onclick={handleClear}
					class="bg-danger text-inverted border-rice rounded-btn rice-press py-3 text-sm font-bold"
				>
					Clear
				</button>
				<button
					type="button"
					onclick={() => handleKeypad('0')}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-xl font-bold"
				>
					0
				</button>
				<button
					type="button"
					onclick={handleBackspace}
					class="bg-subtle text-ink border-line border-rice rounded-btn rice-press py-3 text-sm font-bold"
				>
					⌫
				</button>
			</div>

			<button
				type="button"
				onclick={handleLookup}
				disabled={guestCode.length !== 6 || loading}
				class="bg-accent text-inverted border-rice rounded-btn rice-press w-full py-3 text-lg font-bold disabled:opacity-50"
			>
				{#if loading}
					Mencari...
				{:else}
					Lihat Pesanan
				{/if}
			</button>
			<p class="text-faint mt-2 text-center text-xs font-bold">
				Kode angka = mode lihat saja. Untuk memesan, pindai QR di meja.
			</p>
		</div>

		<div class="bg-shell border-line border-rice rounded-card mt-4 p-4">
			<label class="flex flex-col gap-1 text-xs font-bold text-ink">
				Token tracking takeaway
				<input
					type="text"
					bind:value={trackToken}
					onkeydown={(e) => e.key === 'Enter' && handleTrack()}
					placeholder="Tempel token dari link / struk"
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
				/>
			</label>
			<button
				type="button"
				onclick={handleTrack}
				disabled={!trackToken.trim()}
				class="bg-subtle text-ink border-line border-rice rounded-btn rice-press mt-3 w-full py-2 text-sm font-bold disabled:opacity-50"
			>
				Lacak Takeaway
			</button>
		</div>

		<div class="text-center mt-6">
			<p class="text-faint text-xs font-bold">
				Butuh bantuan? Tunjukkan kode ini kepada staf kami.
			</p>
		</div>
	</div>
</div>
