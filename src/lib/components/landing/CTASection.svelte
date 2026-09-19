<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
</script>

<section class="border-line bg-accent rounded-shell shadow-ricelg border-rice mx-auto mt-6 max-w-7xl px-6 py-16">
	<div use:reveal class="text-center">
		<h2 class="text-inverted font-display mb-2 text-2xl font-extrabold">Siap Menikmati Kopi Terbaik?</h2>
		<p class="text-inverted mb-8 text-sm opacity-80">Duduk di meja? Pindai QR dan pesan langsung — atau lacak takeaway-mu</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<a href="/guest" class="bg-card text-ink rounded-btn border-rice border-line rice-press px-6 py-3 text-sm font-bold">
				Pesan / Lacak Pesanan
			</a>
			<a href="/menu" class="border-line text-inverted rounded-btn border-rice rice-press px-6 py-3 text-sm font-bold">
				Lihat Menu
			</a>
		</div>
	</div>
</section>
