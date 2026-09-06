<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const features = [
		{ icon: '☕', bg: 'bg-caramel', title: 'Biji Premium', desc: 'Biji kopi pilihan dari perkebunan terbaik Indonesia' },
		{ icon: '🍃', bg: 'bg-leaf', title: 'Resep Tradisional', desc: 'Teknik roasting warisan turun-temurun' },
		{ icon: '🥐', bg: 'bg-honey', title: 'Makanan Segar', desc: 'Pastri dan makanan pendamping dibuat setiap hari' },
		{ icon: '🎵', bg: 'bg-grape', title: 'Suasana Nyaman', desc: 'Ruang yang dirancang untuk bersantai dan bekerja' }
	];
</script>

<section id="about" class="border-line bg-shell rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl scroll-mt-24 px-6 py-16">
	<div use:reveal class="mb-12 text-center">
		<h2 class="text-ink mb-2 text-2xl font-extrabold">Kenapa Memilih Kami</h2>
		<p class="text-muted text-sm">Komitmen kami untuk menyajikan pengalaman kopi terbaik</p>
	</div>

	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		{#each features as feature, i (feature.title)}
			<div
				use:reveal={{ delay: i * 90 }}
				class="bg-card rounded-card shadow-rice border-rice border-line rice-lift p-6 text-center"
			>
				<div class="{feature.bg} rounded-btn border-rice border-line mx-auto mb-4 flex h-12 w-12 items-center justify-center">
					<span class="text-ink text-lg font-bold">{feature.icon}</span>
				</div>
				<h3 class="text-ink mb-1 font-bold">{feature.title}</h3>
				<p class="text-muted text-xs">{feature.desc}</p>
			</div>
		{/each}
	</div>
</section>
