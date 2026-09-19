<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import { session } from '$lib/stores';
	import { canAny, navItemFor, requiredAuthoritiesFor } from '$lib/config/nav';
	import Toast from '$lib/components/ui/Toast.svelte';
	import AppSidebar from '$lib/components/app/Sidebar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';

	let { children } = $props();

	let ready = $state(false);

	const pathname = $derived(page.url.pathname);
	const requiredAuthorities = $derived(requiredAuthoritiesFor(pathname));
	const allowed = $derived(
		canAny(session.user?.authorities ?? [], requiredAuthorities ?? undefined)
	);
	const activeLabel = $derived(navItemFor(pathname)?.label ?? 'Panel Staf');

	// Root layout sudah memanggil themeStore.init() sekali + session.restore();
	// di sini cukup gate dari state (tanpa init/restore ganda).
	$effect(() => {
		if (session.status === 'unknown') return;
		ready = true;
		if (!session.isLoggedIn) {
			const next = encodeURIComponent(pathname + page.url.search);
			void goto(`/login?redirectTo=${next}`, { replaceState: true });
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if ready && session.isLoggedIn}
	<div class="app-shell bg-app text-ink flex min-h-screen flex-col lg:h-screen lg:flex-row">
		<AppSidebar />
		<!-- Sengaja TANPA `overflow-hidden`: panel dropdown ThemeSwitcher di top
		     bar harus boleh meluber keluar (kalau tidak, ia akan terpotong).
		     Scroll halaman ditangani container konten di bawah. -->
		<main class="flex min-w-0 flex-1 flex-col">
			{#if allowed}
				<!-- Top bar desktop: tempat yang proper untuk ThemeSwitcher, tidak
				     lagi terpotong oleh container sidebar. Tinggi = --app-topbar. -->
				<div
					class="bg-shell border-line border-rice backdrop-blur-rice hidden flex-none items-center justify-between gap-3 border-b px-6 lg:flex"
					style="height: var(--app-topbar)"
				>
					<div class="min-w-0">
						<p class="text-faint font-mono text-[0.65rem] font-bold tracking-[0.18em] uppercase">
							Panel Staf
						</p>
						<p class="text-ink font-display truncate text-sm font-extrabold">{activeLabel}</p>
					</div>
					<ThemeSwitcher compact />
				</div>
			{/if}

			<div class="min-w-0 flex-1 lg:overflow-y-auto">
				{#if allowed}
					{@render children()}
				{:else}
					<section class="flex min-h-[60vh] items-center justify-center px-4 py-10">
						<div class="bg-shell border-line border-rice shadow-rice rounded-card max-w-md p-8 text-center">
							<Icon name="info" class="text-muted mx-auto mb-3 h-8 w-8" />
							<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
							<p class="text-muted text-sm font-bold">
								Akunmu tidak memiliki izin untuk membuka halaman ini.
							</p>
							<button
								type="button"
								onclick={() => goto(session.resolveLanding())}
								class="bg-accent text-inverted border-line border-rice rounded-btn rice-press mt-4 px-4 py-2 text-sm font-bold"
							>
								Ke halaman kerja saya
							</button>
						</div>
					</section>
				{/if}
			</div>
		</main>
	</div>
{:else if ready && !session.isLoggedIn}
	<div class="bg-app text-ink flex h-screen items-center justify-center">
		<p class="text-muted font-bold">Mengarahkan ke halaman masuk...</p>
	</div>
{:else}
	<!--
		Status sesi belum diketahui. JANGAN render children di sini: halaman
		yang sudah terlanjur memeriksa authority (mis. /reports) akan sempat
		menampilkan "Akses Dibatasi" sebelum sesi selesai dipulihkan.
	-->
	<div class="bg-app text-ink">
		<LoadingState label="Menyiapkan sesi…" full />
	</div>
{/if}

<Toast />
