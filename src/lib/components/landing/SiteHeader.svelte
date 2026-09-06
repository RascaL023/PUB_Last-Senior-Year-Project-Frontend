<script lang="ts">
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';
</script>

<header class="site-header border-line bg-shell border-rice backdrop-blur-rice sticky top-0 z-50 w-full border-b">
	<nav class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Navigasi utama">
		<a href="#top" class="flex min-w-0 items-center gap-3">
			<span class="bg-accent text-inverted rounded-btn flex h-9 w-9 flex-none items-center justify-center text-base font-extrabold">☕</span>
			<span class="min-w-0">
				<span class="text-ink block truncate text-base leading-tight font-extrabold tracking-tight">Kopi Rustik</span>
				<span class="text-muted block text-[11px] leading-tight">Café · sejak 2019</span>
			</span>
		</a>
		<div class="hidden items-center gap-1 md:flex">
			<a href="#menu" class="text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Menu</a>
			<a href="#about" class="text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Tentang</a>
			<a href="#kontak" class="text-muted hover:text-ink rice-press rounded-btn px-4 py-2 text-sm font-bold">Kontak</a>
		</div>
		<div class="flex flex-none items-center gap-2">
			<a
				href="/login"
				class="bg-accent text-inverted rounded-btn border-rice border-line rice-press hidden px-4 py-2 text-xs font-bold sm:inline-block"
			>
				Masuk
			</a>
			<ThemeSwitcher compact />
		</div>
	</nav>
</header>
