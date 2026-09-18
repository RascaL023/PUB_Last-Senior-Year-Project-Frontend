<script lang="ts">
	import SiteHeader from '$lib/components/landing/SiteHeader.svelte';
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import MenuShowcase from '$lib/components/landing/MenuShowcase.svelte';
	import AboutSection from '$lib/components/landing/AboutSection.svelte';
	import CTASection from '$lib/components/landing/CTASection.svelte';
	import FooterSection from '$lib/components/landing/FooterSection.svelte';
</script>

<svelte:head>
	<title>Hysteria Cafe — Kopi Rustik &amp; Pesanan Meja</title>
	<meta
		name="description"
		content="Hysteria Cafe: pesan kopi dan makanan langsung dari meja, lacak pesanan, dan bayar tanpa antre."
	/>
</svelte:head>

<SiteHeader />
<main id="top" class="font-theme bg-app text-ink min-h-screen px-3 pb-6 sm:px-6">
	<HeroSection />
	<MenuShowcase />
	<AboutSection />
	<CTASection />
</main>
<FooterSection />
