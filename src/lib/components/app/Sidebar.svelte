<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores';
	import { canAny, isNavActive, NAV_SECTIONS, type NavItem } from '$lib/config/nav';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';

	let mobileOpen = $state(false);

	const sections = $derived(
		NAV_SECTIONS.map((section) => ({
			...section,
			items: section.items.filter((item) =>
				canAny(session.user?.authorities ?? [], item.authorities)
			)
		})).filter((section) => section.items.length > 0)
	);

	const activeItem = $derived(
		sections.flatMap((section) => section.items).find((item) => isNavActive(item, page.url.pathname))
	);

	const roleLabel = $derived(
		session.user?.roles.length ? session.user.roles.join(' · ') : 'Member'
	);

	function handleLogout() {
		void session.logout().then(() => goto('/login'));
	}

	function go(item: NavItem) {
		mobileOpen = false;
		if (isNavActive(item, page.url.pathname)) return;
		void goto(item.href);
	}

	$effect(() => {
		// Tutup drawer tiap kali rute berubah (mis. back/forward browser).
		if (page.url.pathname) mobileOpen = false;
	});
</script>

{#snippet navContent()}
	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="border-line border-rice flex-1 overflow-y-auto py-3">
			{#each sections as section (section.label)}
				<p class="text-faint px-4 pt-3 pb-1 font-mono text-[0.65rem] font-bold tracking-[0.18em] uppercase">
					{section.label}
				</p>
				{#each section.items as item (item.href)}
					{@const active = activeItem?.href === item.href}
					<button
						type="button"
						onclick={() => go(item)}
						aria-current={active ? 'page' : undefined}
						class="rounded-btn border-rice rice-press mx-2 mb-0.5 flex w-[calc(100%-1rem)] items-center gap-3 px-3 py-2 text-left font-bold
							{active
							? 'bg-accent text-inverted border-line shadow-ricesm'
							: 'text-muted hover:text-ink hover:bg-card-hover border-transparent'}"
					>
						<Icon name={item.icon} class="h-5 w-5 flex-none" />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm">{item.label}</span>
							{#if item.description}
								<span class="block truncate text-[0.7rem] font-normal opacity-70">{item.description}</span>
							{/if}
						</span>
					</button>
				{/each}
			{/each}
		</div>

		<div class="border-line border-rice flex flex-col gap-2 p-3">
			<ThemeSwitcher compact />
			{#if session.user}
				<div class="bg-subtle border-line border-rice rounded-btn px-3 py-2">
					<p class="text-ink truncate font-mono text-xs font-bold">{session.user.email || '—'}</p>
					<p class="text-muted truncate text-[0.7rem] font-bold">{roleLabel}</p>
				</div>
			{/if}
			<button
				type="button"
				onclick={handleLogout}
				class="rounded-btn border-rice rice-press text-danger hover:bg-danger/10 flex w-full items-center gap-3 px-3 py-2 text-left font-bold"
			>
				<Icon name="logout" class="h-5 w-5 flex-none" />
				<span class="text-sm">Keluar</span>
			</button>
		</div>
	</div>
{/snippet}

<!-- Top bar (mobile & tablet) -->
<header class="bg-shell border-line border-rice flex items-center gap-2 px-3 py-2 lg:hidden">
	<button
		type="button"
		onclick={() => (mobileOpen = !mobileOpen)}
		aria-label="Buka menu navigasi"
		aria-expanded={mobileOpen}
		class="bg-subtle text-ink border-line border-rice rounded-btn rice-press shadow-ricesm p-2"
	>
		<Icon name={mobileOpen ? 'close' : 'menu'} class="h-5 w-5" />
	</button>
	<h1 class="font-display text-ink min-w-0 flex-1 truncate text-base font-extrabold">Hysteria Cafe</h1>
	<ThemeSwitcher compact />
</header>

<!-- Sidebar (desktop) -->
<nav
	class="bg-shell border-line border-rice hidden w-64 flex-shrink-0 flex-col lg:flex"
	aria-label="Navigasi utama"
>
	<div class="border-line border-rice p-4">
		<h1 class="font-display text-ink text-xl font-extrabold">Hysteria Cafe</h1>
		<p class="text-muted mt-1 font-mono text-xs">
			{activeItem?.label ?? 'Panel Staf'}
		</p>
	</div>
	{@render navContent()}
</nav>

<!-- Drawer (mobile & tablet) -->
{#if mobileOpen}
	<div class="fixed inset-0 z-40 lg:hidden">
		<button
			type="button"
			aria-label="Tutup menu navigasi"
			onclick={() => (mobileOpen = false)}
			class="bg-overlay absolute inset-0 h-full w-full cursor-default"
		></button>
		<div class="bg-shell border-line border-rice shadow-ricelg absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col">
			<div class="border-line border-rice flex items-center justify-between p-4">
				<h1 class="font-display text-ink text-lg font-extrabold">Hysteria Cafe</h1>
				<button
					type="button"
					onclick={() => (mobileOpen = false)}
					aria-label="Tutup menu"
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press p-1.5"
				>
					<Icon name="close" class="h-4 w-4" />
				</button>
			</div>
			{@render navContent()}
		</div>
	</div>
{/if}
