<script lang="ts">
	import ThemeSwitcher from '$lib/components/theme/ThemeSwitcher.svelte';
</script>

<main class="font-theme bg-app text-ink min-h-screen p-6">
	<div class="mx-auto flex max-w-3xl flex-col gap-4">
		<ThemeSwitcher />
		<section class="border-line bg-shell shadow-ricelg rounded-shell border-rice p-4">
			<h1 class="text-lg font-extrabold">Theme SSOT Preview</h1>
			<p class="text-muted text-sm">Switch tema untuk cek warna, radius, shadow, dan blur.</p>
		</section>
		<section class="border-line bg-card shadow-rice rounded-card border-rice rice-lift backdrop-blur-rice p-4">
			<p class="text-sm">Card memakai <code>bg-card rounded-card shadow-rice border-rice</code>.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<span class="border-line bg-subtle text-muted rounded-pill border-rice px-3 py-1 text-xs">pill</span>
				<button class="border-line bg-accent text-inverted rounded-btn border-rice rice-press px-3 py-1.5 text-xs font-bold">accent</button>
				<button class="border-line bg-accent2 text-inverted rounded-btn border-rice rice-press px-3 py-1.5 text-xs font-bold">accent2</button>
			</div>
			<div class="mt-3 grid grid-cols-5 gap-2 text-center text-xs font-bold">
				<span class="bg-caramel rounded-btn p-2">cara</span>
				<span class="bg-latte rounded-btn p-2">latte</span>
				<span class="bg-leaf rounded-btn p-2">leaf</span>
				<span class="bg-blossom rounded-btn p-2">bloss</span>
				<span class="bg-ember rounded-btn p-2">ember</span>
				<span class="bg-honey rounded-btn p-2">honey</span>
				<span class="bg-grape rounded-btn p-2">grape</span>
				<span class="bg-sky rounded-btn p-2">sky</span>
				<span class="bg-danger rounded-btn p-2">danger</span>
				<span class="bg-aqua rounded-btn p-2">aqua</span>
			</div>
		</section>
	</div>
</main>
