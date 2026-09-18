<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { session } from '$lib/stores';
	import Toast from '$lib/components/ui/Toast.svelte';
	import AppSidebar from '$lib/components/app/Sidebar.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { children } = $props();

	let ready = $state(false);

	onMount(() => {
		themeStore.init();
		void session.restore().then(() => {
			ready = true;
			if (!session.isLoggedIn) {
				void goto('/login');
			}
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if ready && session.isLoggedIn}
	<div class="flex h-screen bg-app text-ink">
		<AppSidebar />
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
{:else if ready && !session.isLoggedIn}
	<div class="flex h-screen bg-app text-ink items-center justify-center">
		<p class="text-muted font-bold">Mengarahkan ke halaman masuk...</p>
	</div>
{:else}
	<div class="flex h-screen bg-app text-ink">
		{@render children()}
	</div>
{/if}

<Toast />
