<script lang="ts">
	import SiteHeader from '$lib/components/landing/SiteHeader.svelte';
	import HeroSection from '$lib/components/landing/HeroSection.svelte';
	import MenuShowcase from '$lib/components/landing/MenuShowcase.svelte';
	import AboutSection from '$lib/components/landing/AboutSection.svelte';
	import CTASection from '$lib/components/landing/CTASection.svelte';
	import FooterSection from '$lib/components/landing/FooterSection.svelte';
</script>

<SiteHeader />
<main id="top" class="font-theme bg-app text-ink min-h-screen px-3 pb-6 sm:px-6">
	<HeroSection />
	<MenuShowcase />
	<AboutSection />
	<CTASection />
</main>
<FooterSection />
