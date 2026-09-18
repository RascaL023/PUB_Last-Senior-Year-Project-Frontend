<script lang="ts">
	import { page } from '$app/state';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const status = $derived(page.status);

	const copy = $derived(
		status === 404
			? {
					code: 404,
					title: 'Halaman Tidak Ditemukan',
					message: 'Alamat yang kamu tuju tidak ada atau sudah dipindahkan.',
					icon: 'search'
				}
			: status === 401
				? {
						code: 401,
						title: 'Sesi Berakhir',
						message: 'Silakan masuk kembali untuk melanjutkan.',
						icon: 'info'
					}
				: status === 403
					? {
							code: 403,
							title: 'Akses Ditolak',
							message: 'Akunmu tidak memiliki hak akses ke halaman ini.',
							icon: 'info'
						}
					: {
							code: status,
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
	<title>{copy.code} — Hysteria Cafe</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10">
	<ErrorState
		code={copy.code}
		title={copy.title}
		message={copy.message}
		icon={copy.icon}
		retryLabel={status >= 500 ? 'Muat ulang' : 'Coba lagi'}
		onRetry={status >= 500 ? reload : undefined}
		loginHref={showLogin ? '/login' : undefined}
	>
		<a
			href="/"
			class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
		>
			Beranda
		</a>
	</ErrorState>
</main>
