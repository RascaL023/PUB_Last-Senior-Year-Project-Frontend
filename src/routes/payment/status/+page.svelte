<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { PaymentResponse } from '$lib/domain/payment';
	import { toAppError } from '$lib/core/http/error-messages';
	import Icon from '$lib/components/ui/Icon.svelte';

	const api = getApi();

	type Phase = 'idle' | 'waiting' | 'success' | 'failed' | 'timeout' | 'need-login' | 'not-found';

	let phase = $state<Phase>('idle');
	let payment = $state<PaymentResponse | null>(null);
	let attempts = $state(0);
	let error = $state<string | null>(null);

	let pollTimer: ReturnType<typeof setInterval> | null = null;
	const MAX_ATTEMPTS = 30; // ~2 menit @ 4 detik
	const POLL_MS = 4000;

	const externalId = $derived(
		page.url.searchParams.get('external_id') ?? page.url.searchParams.get('xendit_invoice_id') ?? ''
	);
	const paymentIdParam = $derived(Number(page.url.searchParams.get('paymentId')) || null);
	const isLoggedIn = $derived(session.isLoggedIn);

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		});
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function fetchByPaymentId(id: number): Promise<PaymentResponse | null> {
		try {
			return await api.payments.getById(id);
		} catch {
			return null;
		}
	}

	async function fetchByExternalId(ext: string): Promise<PaymentResponse | null> {
		// BE `GET /payments?keyword=` mencakup nomor invoice & keterangan —
		// external_id Xendit dipakai sebagai petunjuk pencarian, bukan bukti bayar.
		try {
			const result = await api.payments.list({ keyword: ext, size: 5 });
			return (
				result.items.find((p) => p.externalId === ext) ??
				result.items.find((p) => p.invoiceNumber === ext) ??
				null
			);
		} catch {
			return null;
		}
	}

	async function pollOnce() {
		attempts += 1;
		let found: PaymentResponse | null = null;
		if (paymentIdParam) found = await fetchByPaymentId(paymentIdParam);
		else if (externalId) found = await fetchByExternalId(externalId);
		if (found) {
			payment = found;
			if (found.status === 'PAID') {
				phase = 'success';
				stopPolling();
				return;
			}
			if (found.status === 'EXPIRED' || found.status === 'FAILED') {
				phase = 'failed';
				stopPolling();
				return;
			}
		}
		if (attempts >= MAX_ATTEMPTS) {
			phase = payment ? 'timeout' : 'not-found';
			stopPolling();
		}
	}

	function start() {
		stopPolling();
		attempts = 0;
		payment = null;
		error = null;
		if (!paymentIdParam && !externalId) {
			phase = 'idle';
			return;
		}
		if (!isLoggedIn) {
			// Status kebenaran hanya dari webhook → BE → polling terautentikasi.
			// Pengunjung tanpa login tidak bisa polling — arahkan ke kasir.
			phase = 'need-login';
			return;
		}
		phase = 'waiting';
		void pollOnce().then(() => {
			if (phase === 'waiting' && !pollTimer) {
				pollTimer = setInterval(() => void pollOnce(), POLL_MS);
			}
		});
	}

	$effect(() => {
		if (session.status !== 'unknown') start();
	});

	onDestroy(() => stopPolling());
</script>

<svelte:head>
	<title>Status Pembayaran — Hysteria Cafe</title>
</svelte:head>

<div class="bg-app text-ink flex min-h-screen items-center justify-center px-3 py-8">
	<div class="mx-auto w-full max-w-md">
		<div class="bg-shell border-line border-rice rounded-card shadow-rice p-6 text-center">
			<Icon name="wallet" class="text-muted mx-auto mb-3 h-10 w-10" />
			<p class="text-accent mb-1 font-mono text-xs font-bold tracking-[0.2em] uppercase">
				— Status Pembayaran
			</p>

			{#if phase === 'idle'}
				<h1 class="font-display text-ink text-xl font-extrabold">Tidak ada referensi pembayaran</h1>
				<p class="text-muted mt-2 text-sm font-bold">
					Halaman ini dibuka otomatis setelah kamu membayar via Xendit. Tunjukkan struk atau nomor
					tagihan ke kasir bila kamu sampai di sini tanpa membayar.
				</p>
				<a
					href="/guest"
					class="bg-accent text-inverted rounded-btn rice-press mt-4 inline-block px-4 py-2 text-sm font-bold"
				>
					Ke halaman tamu
				</a>
			{:else if phase === 'need-login'}
				<h1 class="font-display text-ink text-xl font-extrabold">Menunggu konfirmasi kasir</h1>
				{#if externalId}
					<p class="text-muted mt-2 font-mono text-xs">Referensi: {externalId}</p>
				{/if}
				<p class="text-muted mt-2 text-sm font-bold">
					Kebenaran pembayaran hanya dari sistem kasir (webhook → server), bukan dari halaman ini.
					Tunjukkan referensi di atas ke kasir atau
					<a href="/login" class="text-accent font-bold hover:underline">masuk sebagai staf</a>
					untuk memantau status.
				</p>
			{:else if phase === 'waiting'}
				<h1 class="font-display text-ink text-xl font-extrabold">Menunggu pembayaran...</h1>
				<p class="text-muted mt-2 text-sm font-bold">
					Jangan tutup halaman ini. Status diperbarui otomatis ({attempts}/{MAX_ATTEMPTS}).
				</p>
				{#if payment}
					<p class="text-ink mt-3 font-mono text-sm font-bold">
						{payment.invoiceNumber} · {formatPrice(payment.amount)} · {payment.status}
					</p>
				{:else if externalId}
					<p class="text-faint mt-3 font-mono text-xs">Referensi: {externalId}</p>
				{/if}
				<p class="text-faint mt-2 text-xs">Memeriksa tiap 4 detik…</p>
			{:else if phase === 'success' && payment}
				<h1 class="font-display text-leaf text-xl font-extrabold">Pembayaran lunas!</h1>
				<p class="text-ink mt-2 font-mono text-sm font-bold">
					{payment.invoiceNumber} · {formatPrice(payment.amount)}
				</p>
				<p class="text-muted mt-1 text-sm font-bold">Terima kasih. Tunjukkan layar ini ke staf.</p>
				<a
					href="/guest"
					class="bg-accent text-inverted rounded-btn rice-press mt-4 inline-block px-4 py-2 text-sm font-bold"
				>
					Kembali
				</a>
			{:else if phase === 'failed' && payment}
				<h1 class="font-display text-danger text-xl font-extrabold">Pembayaran {payment.status === 'EXPIRED' ? 'kedaluwarsa' : 'gagal'}</h1>
				<p class="text-ink mt-2 font-mono text-sm font-bold">
					{payment.invoiceNumber} · {formatPrice(payment.amount)}
				</p>
				<p class="text-muted mt-1 text-sm font-bold">
					Hubungi kasir untuk membuat pembayaran baru. Catatan: satu tagihan hanya boleh punya satu
					pembayaran aktif — pembayaran ini sudah terminal sehingga kasir bisa buatkan yang baru.
				</p>
			{:else if phase === 'timeout'}
				<h1 class="font-display text-ink text-xl font-extrabold">Belum ada konfirmasi</h1>
				<p class="text-muted mt-2 text-sm font-bold">
					{error ?? 'Status belum berubah setelah ~2 menit. Pembayaran mungkin masih diproses.'}
					Tunjukkan referensi ini ke kasir untuk pengecekan manual.
				</p>
				<button
					type="button"
					onclick={start}
					class="bg-subtle text-ink rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-sm font-bold"
				>
					Cek lagi
				</button>
			{:else}
				<h1 class="font-display text-ink text-xl font-extrabold">Data tidak ditemukan</h1>
				<p class="text-muted mt-2 text-sm font-bold">
					Referensi pembayaran tidak cocok dengan data kasir. Periksa kembali tautan atau hubungi
					kasir.
				</p>
				<button
					type="button"
					onclick={start}
					class="bg-subtle text-ink rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-sm font-bold"
				>
					Coba lagi
				</button>
			{/if}
		</div>
		<p class="text-faint mt-4 text-center text-xs font-bold">
			Parameter redirect Xendit hanya penunjuk — bukti bayar selalu dari status server.
		</p>
	</div>
</div>
