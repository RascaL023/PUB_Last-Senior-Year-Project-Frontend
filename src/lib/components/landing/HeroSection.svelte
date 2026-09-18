<script lang="ts">
	import { fly } from 'svelte/transition';
	import MenuImage from './MenuImage.svelte';
	import { motionDuration } from '$lib/actions/reveal';
</script>

<section class="landing-shell border-line bg-shell rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl px-6 py-16 lg:py-20">
	<div class="grid items-center gap-10 lg:grid-cols-2">
		<div>
			<div in:fly={{ y: 20, duration: motionDuration(450) }}>
				<span class="border-line bg-subtle text-muted rounded-pill border-rice shadow-ricesm px-3 py-1 text-xs font-bold">
					Biji premium · Roasting tradisional
				</span>
			</div>
			<h1
				in:fly={{ y: 28, duration: motionDuration(500), delay: motionDuration(90) }}
				class="text-ink font-display mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl"
			>
				Hysteria Cafe
			</h1>
			<p
				in:fly={{ y: 28, duration: motionDuration(500), delay: motionDuration(180) }}
				class="text-muted mt-4 max-w-xl text-base sm:text-lg"
			>
				Koleksi biji kopi premium dari perkebunan terbaik Indonesia, disajikan dengan teknik
				roasting tradisional warisan turun-temurun.
			</p>
			<div
				in:fly={{ y: 28, duration: motionDuration(500), delay: motionDuration(270) }}
				class="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
			>
				<a
					href="#menu"
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-6 py-3 text-center text-sm font-bold"
				>
					Lihat Menu
				</a>
				<a
					href="/guest"
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press rice-ghost px-6 py-3 text-center text-sm font-bold"
				>
					Pesan dari Meja / Lacak Takeaway
				</a>
				<a
					href="#about"
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press rice-ghost px-6 py-3 text-center text-sm font-bold"
				>
					Pelajari Lebih Lanjut
				</a>
			</div>
		</div>
		<div
			in:fly={{ y: 32, duration: motionDuration(550), delay: motionDuration(200) }}
			class="animate-float"
		>
			<div class="bg-card rounded-card shadow-rice border-rice border-line rice-lift overflow-hidden">
				<MenuImage
					src="/images/hero-coffee.jpg"
					alt="Secangkir kopi signature Hysteria Cafe"
					wrapperClass="aspect-[16/10] w-full"
				/>
				<div class="flex items-center justify-between gap-2 p-4">
					<div>
						<p class="text-ink text-sm font-bold">Signature Hysteria</p>
						<p class="text-muted text-xs">Arabika Gayo · medium roast</p>
					</div>
					<span class="bg-leaf text-inverted rounded-pill border-rice border-line shadow-ricesm px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap">Favorit</span>
				</div>
			</div>
		</div>
	</div>
</section>
