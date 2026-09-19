<script lang="ts">
	import { page } from '$app/state';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const status = $derived(page.status);
	const isServerError = $derived(status >= 500);

	const copy = $derived(
		status === 404
			? {
					title: 'Halaman Tidak Ditemukan',
					message: 'Alamat yang kamu tuju tidak ada atau sudah dipindahkan.',
					icon: 'search'
				}
			: status === 401
				? {
						title: 'Sesi Berakhir',
						message: 'Sesi kamu sudah berakhir. Masuk kembali untuk melanjutkan.',
						icon: 'user'
					}
				: status === 403
					? {
							title: 'Akses Ditolak',
							message: 'Akunmu tidak memiliki izin untuk membuka halaman ini.',
							icon: 'info'
						}
					: isServerError
						? {
								title: 'Terjadi Gangguan',
								message: 'Server sedang bermasalah. Coba beberapa saat lagi.',
								icon: 'info'
							}
						: {
								title: 'Terjadi Kesalahan',
								message: page.error?.message ?? 'Sesuatu yang tidak terduga terjadi. Coba lagi.',
								icon: 'info'
							}
	);

	const showLogin = $derived(status === 401 || status === 403);

	function reload() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{status} — Hysteria Cafe</title>
</svelte:head>

<main
	class="font-theme bg-app text-ink flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12"
>
	<a href="/" class="flex items-center gap-3" aria-label="Hysteria Cafe — beranda">
		<span
			class="bg-accent text-inverted rounded-btn flex h-10 w-10 items-center justify-center"
		>
			<Icon name="coffee" class="h-5 w-5" />
		</span>
		<span class="text-ink font-display text-base font-extrabold tracking-tight">
			Hysteria Cafe
		</span>
	</a>

	<ErrorState
		code={status}
		title={copy.title}
		message={copy.message}
		icon={copy.icon}
		retryLabel={isServerError ? 'Muat ulang' : 'Coba lagi'}
		onRetry={isServerError ? reload : undefined}
		loginHref={showLogin ? '/login' : undefined}
	>
		<a
			href="/"
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
		>
			Beranda
		</a>
	</ErrorState>

	<p class="text-faint font-mono text-[11px]">
		Kode status {status} · Hysteria Cafe
	</p>
</main>
