<script lang="ts">
	import { goto } from '$app/navigation';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';

	const api = getApi();

	let guestCode = $state('');
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
</script>

<div class="bg-app text-ink min-h-screen flex items-center justify-center px-3 py-8">
	<div class="mx-auto max-w-md w-full">
		<div class="text-center mb-8">
			<Icon name="info" class="h-12 w-12 text-accent mx-auto mb-3" />
			<h1 class="font-display text-ink text-3xl font-extrabold mb-2">Hysteria Cafe</h1>
			<p class="text-muted text-sm font-bold">Masukkan kode meja (6 digit) untuk melihat pesanan Anda.</p>
		</div>

		<div class="bg-shell border-line border-rice rounded-card p-6">
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
		</div>

		<div class="text-center mt-6">
			<p class="text-faint text-xs font-bold">
				Butuh bantuan? Tunjukkan kode ini kepada staf kami.
			</p>
		</div>
	</div>
</div>
