<script lang="ts">
	import { session } from '$lib/stores';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));

	const navItems = $derived([
		{
			label: 'Dashboard',
			href: '/reports',
			icon: 'dashboard',
			show: can('report.read')
		},
		{
			label: 'Pesanan',
			href: '/orders',
			icon: 'receipt',
			show: can('order.read')
		},
		{
			label: 'Meja & Sesi',
			href: '/dinings',
			icon: 'table',
			show: can('dining.read')
		},
		{
			label: 'Pembayaran',
			href: '/payments',
			icon: 'wallet',
			show: can('payment.create')
		},
		{
			label: 'Dapur',
			href: '/kitchen',
			icon: 'kitchen',
			show: can('kitchen.read')
		},
		{
			label: 'Lantai',
			href: '/floor',
			icon: 'floor',
			show: can('table.read') || can('dining.read')
		},
		{
			label: 'Akun Saya',
			href: '/my',
			icon: 'user',
			show: session.isLoggedIn
		}
	]);

	const visibleNavItems = $derived(navItems.filter((item) => item.show));

	function handleLogout() {
		void session.logout();
		void goto('/login');
	}

	function handleNav(href: string) {
		void goto(href);
	}
</script>

<nav class="bg-shell border-r border-line border-rice flex flex-col w-64 flex-shrink-0">
	<div class="p-4 border-b border-line border-rice">
		<h1 class="font-display text-ink text-xl font-extrabold">Hysteria Cafe</h1>
		{#if session.user}
			<p class="text-muted text-xs mt-1">{session.user.email}</p>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto py-2">
		{#each visibleNavItems as item (item.href)}
			<button
				type="button"
				onclick={() => handleNav(item.href)}
				class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-ink hover:bg-card-hover rounded-none font-bold transition-colors"
			>
				<Icon name={item.icon} class="h-5 w-5 text-muted" />
				<span class="text-sm">{item.label}</span>
			</button>
		{/each}
	</div>

	<div class="p-4 border-t border-line border-rice">
		<button
			type="button"
			onclick={handleLogout}
			class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-danger hover:bg-danger/10 rounded-btn rice-press font-bold"
		>
			<Icon name="logout" class="h-5 w-5" />
			<span class="text-sm">Keluar</span>
		</button>
	</div>
</nav>
