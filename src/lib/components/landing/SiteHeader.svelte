<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';
	import CartDrawer from '$lib/components/cart/CartDrawer.svelte';
	import { cart, session } from '$lib/stores';

	async function handleLogout() {
		await session.logout();
		await goto('/');
	}
</script>

<header class="site-header border-line bg-shell border-rice backdrop-blur-rice sticky top-0 z-50 w-full border-b">
	<nav class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Navigasi utama">
		<a href="#top" class="flex min-w-0 items-center gap-3">
			<span class="bg-accent text-inverted rounded-btn flex h-9 w-9 flex-none items-center justify-center text-base font-extrabold">☕</span>
			<span class="min-w-0">
				<span class="text-ink font-display block truncate text-base leading-tight font-extrabold tracking-tight">Kopi Rustik</span>
				<span class="text-muted block text-[11px] leading-tight">Café · sejak 2019</span>
			</span>
		</a>
		<div class="hidden items-center gap-1 md:flex">
			<a href="#menu" class="nav-link text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Menu</a>
			<a href="#about" class="nav-link text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Tentang</a>
			<a href="#kontak" class="nav-link text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Kontak</a>
		</div>
		<div class="flex flex-none items-center gap-2">
			<button
				type="button"
				onclick={() => cart.open()}
				aria-label="Buka keranjang, {cart.itemCount} item"
				class="bg-subtle text-ink rounded-btn border-rice border-line rice-press relative px-3 py-2 text-sm font-bold"
			>
				🧺
				{#if cart.itemCount > 0}
					<span
						class="bg-danger text-inverted rounded-pill absolute -top-2 -right-2 px-1.5 py-0.5 font-mono text-[10px] font-bold"
					>
						{cart.itemCount}
					</span>
				{/if}
			</button>
			{#if session.status === 'ready' && session.user}
				<span
					title={session.user.email}
					class="border-line bg-subtle text-muted rounded-pill border-rice hidden max-w-40 truncate px-3 py-2 text-xs font-bold sm:inline-block"
				>
					{session.user.email}
				</span>
				<button
					type="button"
					onclick={handleLogout}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press hidden px-4 py-2 text-xs font-bold sm:inline-block"
				>
					Keluar
				</button>
			{:else}
				<a
					href="/login"
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press hidden px-4 py-2 text-xs font-bold sm:inline-block"
				>
					Masuk
				</a>
			{/if}
			<ThemeSwitcher compact />
		</div>
	</nav>
</header>

<CartDrawer />
