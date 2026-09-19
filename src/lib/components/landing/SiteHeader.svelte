<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';
	import CartDrawer from '$lib/components/cart/CartDrawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { cart, session } from '$lib/stores';

	let accountOpen = $state(false);
	let accountRoot = $state<HTMLDivElement>();

	async function handleLogout() {
		accountOpen = false;
		await session.logout();
		await goto('/');
	}

	function toggleAccount() {
		accountOpen = !accountOpen;
	}

	onMount(() => {
		function handlePointerDown(event: PointerEvent) {
			if (!accountOpen || accountRoot?.contains(event.target as Node)) return;
			accountOpen = false;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') accountOpen = false;
		}

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<header class="site-header border-line bg-shell border-rice backdrop-blur-rice sticky top-0 z-50 w-full border-b">
	<nav class="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6" aria-label="Navigasi utama">
		<a href="/" class="mr-auto flex min-w-0 items-center gap-3">
			<span class="bg-accent text-inverted rounded-btn flex h-9 w-9 flex-none items-center justify-center text-base font-extrabold"><Icon name="coffee" class="h-5 w-5" /></span>
			<span class="min-w-0">
				<span class="text-ink font-display block truncate text-base leading-tight font-extrabold tracking-tight">Hysteria Cafe</span>
				<span class="text-muted block text-[11px] leading-tight">Café · sejak 2019</span>
			</span>
		</a>
		<div class="flex flex-none items-center gap-2">
			<button
				type="button"
				onclick={() => cart.open()}
				aria-label="Buka keranjang, {cart.itemCount} item"
				class="bg-subtle text-ink rounded-btn border-rice border-line rice-press relative px-3 py-2 text-sm font-bold"
			>
				<Icon name="cart" class="h-5 w-5" />
				{#if cart.itemCount > 0}
					<span
						class="bg-danger text-inverted rounded-pill absolute -top-2 -right-2 px-1.5 py-0.5 font-mono text-[10px] font-bold"
					>
						{cart.itemCount}
					</span>
				{/if}
			</button>
			{#if session.status === 'ready' && session.user}
				<div class="relative" bind:this={accountRoot}>
					<button
						type="button"
						onclick={toggleAccount}
						aria-label="Menu akun, {session.user.email}"
						aria-haspopup="menu"
						aria-expanded={accountOpen}
						class="bg-accent text-inverted rounded-pill rice-press flex h-9 w-9 items-center justify-center font-bold"
					>
						<Icon name="user" class="h-5 w-5" />
					</button>
					{#if accountOpen}
						<div
							role="menu"
							class="account-menu bg-shell border-line border-rice rounded-card shadow-ricelg absolute right-0 z-50 mt-2 w-60 border p-2"
						>
							<span
								title={session.user.email}
								class="text-muted border-line bg-subtle rounded-pill border-rice mb-2 block truncate px-3 py-2 text-xs font-bold"
							>
								{session.user.email}
							</span>
							<button
								type="button"
								role="menuitem"
								onclick={handleLogout}
								class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press flex w-full items-center gap-2 px-3 py-2 text-xs font-bold"
							>
								<Icon name="logout" class="h-4 w-4" />
								Keluar
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href="/login"
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold sm:px-4"
				>
					Masuk
				</a>
			{/if}
			<ThemeSwitcher compact />
		</div>
	</nav>
</header>

<CartDrawer />

<style>
	.account-menu {
		top: 100%;
		animation: menu-in 160ms cubic-bezier(0.215, 0.61, 0.355, 1);
		transform-origin: top right;
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-0.25rem) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.account-menu {
			animation: none;
		}
	}
</style>
