<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import { session } from '$lib/stores';
	import { canAny, requiredAuthoritiesFor } from '$lib/config/nav';
	import Toast from '$lib/components/ui/Toast.svelte';
	import AppSidebar from '$lib/components/app/Sidebar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { children } = $props();

	let ready = $state(false);

	const pathname = $derived(page.url.pathname);
	const requiredAuthorities = $derived(requiredAuthoritiesFor(pathname));
	const allowed = $derived(
		canAny(session.user?.authorities ?? [], requiredAuthorities ?? undefined)
	);

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
	<div class="bg-app text-ink flex min-h-screen flex-col lg:h-screen lg:flex-row">
		<AppSidebar />
		<main class="min-w-0 flex-1 lg:overflow-y-auto">
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
		</main>
	</div>
{:else if ready && !session.isLoggedIn}
	<div class="bg-app text-ink flex h-screen items-center justify-center">
		<p class="text-muted font-bold">Mengarahkan ke halaman masuk...</p>
	</div>
{:else}
	<div class="bg-app text-ink flex h-screen">
		{@render children()}
	</div>
{/if}

<Toast />
