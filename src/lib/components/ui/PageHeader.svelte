<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		class: className = '',
		children
	}: {
		/** Judul halaman — font display, satu sumber konsistensi antar halaman. */
		title: string;
		/** Keterangan singkat di bawah judul (mis. jumlah data / ringkasan). */
		subtitle?: string;
		class?: string;
		/** Aksi utama halaman (tombol) — dirender rata kanan, wrap di layar kecil. */
		children?: Snippet;
	} = $props();
</script>

<header class="mb-6 flex flex-wrap items-center justify-between gap-3 {className}">
	<div class="min-w-0">
		<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">{title}</h2>
		{#if subtitle}
			<p class="text-muted mt-1 text-xs font-bold">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		<div class="flex flex-wrap items-center gap-2">
			{@render children()}
		</div>
	{/if}
</header>
