<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
</script>

<footer id="kontak" use:reveal class="border-line bg-shell border-t border-rice mx-auto mt-6 mb-6 max-w-7xl scroll-mt-24 px-6 py-8">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
		<div>
			<h4 class="text-ink font-bold mb-3">Kopi Rustik</h4>
			<p class="text-muted text-xs leading-relaxed">Café yang menggabungkan biji kopi premium dengan resep tradisional Indonesia.</p>
		</div>

		<div>
			<h4 class="text-ink font-bold mb-3">Navigasi</h4>
			<ul class="space-y-2">
				<li><a href="#menu" class="text-muted hover:text-ink text-xs rice-press rounded-btn px-2 py-1">Menu</a></li>
			<li><a href="#about" class="text-muted hover:text-ink text-xs rice-press rounded-btn px-2 py-1">Tentang</a></li>
			<li><a href="#order" class="text-muted hover:text-ink text-xs rice-press rounded-btn px-2 py-1">Order</a></li>
			</ul>
		</div>

		<div>
			<h4 class="text-ink font-bold mb-3">Kontak</h4>
			<ul class="space-y-2">
				<li class="text-muted text-xs">admin@kopirustik.id</li>
				<li class="text-muted text-xs">Jl. Kopi No. 42</li>
				<li class="text-muted text-xs">Senin-Sabtu 07:00-22:00</li>
			</ul>
		</div>

		<div>
			<h4 class="text-ink font-bold mb-3">Ikuti Kami</h4>
			<div class="flex gap-2">
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">Instagram</span>
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">Twitter</span>
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">TikTok</span>
			</div>
		</div>
	</div>

	<div class="mt-8 border-linemuted border-t pt-6 text-center">
		<p class="text-faint text-xs">© 2026 Kopi Rustik. All rights reserved.</p>
	</div>
</footer>
