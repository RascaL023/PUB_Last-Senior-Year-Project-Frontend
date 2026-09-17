<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
</script>

<footer id="kontak" use:reveal class="site-footer border-line bg-shell border-rice w-full scroll-mt-24 border-t px-4 py-10 sm:px-6">
	<div class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<h4 class="text-ink mb-3 font-bold">Hysteria Cafe</h4>
			<p class="text-muted text-xs leading-relaxed">Café yang menggabungkan biji kopi premium dengan resep tradisional Indonesia.</p>
		</div>

		<nav aria-label="Navigasi footer">
			<h4 class="text-ink mb-3 font-bold">Navigasi</h4>
			<ul class="space-y-2">
				<li><a href="#menu" class="footer-link text-muted hover:text-ink text-xs">Menu</a></li>
				<li><a href="#about" class="footer-link text-muted hover:text-ink text-xs">Tentang</a></li>
				<li><a href="#order" class="footer-link text-muted hover:text-ink text-xs">Order</a></li>
			</ul>
		</nav>

		<div>
			<h4 class="text-ink mb-3 font-bold">Kontak</h4>
			<ul class="space-y-2">
				<li class="text-muted text-xs">admin@hysteria.cafe</li>
				<li class="text-muted text-xs">Jl. Kopi No. 42</li>
				<li class="text-muted text-xs">Senin-Sabtu 07:00-22:00</li>
			</ul>
		</div>

		<div>
			<h4 class="text-ink mb-3 font-bold">Ikuti Kami</h4>
			<div class="flex gap-2">
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">Instagram</span>
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">Twitter</span>
				<span class="bg-subtle text-muted rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs">TikTok</span>
			</div>
		</div>
	</div>

	<div class="mx-auto mt-8 w-full max-w-7xl border-linemuted border-t pt-6 text-center">
		<p class="text-faint text-xs">© 2026 Hysteria Cafe. All rights reserved.</p>
	</div>
</footer>

<style>
	.site-footer {
		position: relative;
	}

	.site-footer::before {
		content: '';
		position: absolute;
		top: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--theme-accent-primary) 25%,
			var(--theme-accent-secondary) 50%,
			var(--theme-accent-primary) 75%,
			transparent
		);
		background-size: 200% 100%;
		animation: footer-line-sweep 7s linear infinite;
	}

	@keyframes footer-line-sweep {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.footer-link {
		position: relative;
		display: inline-block;
		padding: 0.25rem 0;
	}

	.footer-link::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: var(--theme-accent-primary);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.25s ease;
	}

	.footer-link:hover::after {
		transform: scaleX(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.site-footer::before {
			animation: none;
		}
		.footer-link::after {
			transition: none;
		}
	}
</style>
