<script lang="ts">
	let {
		label = 'Memuat…',
		hint,
		full = false,
		class: className = ''
	}: {
		label?: string;
		hint?: string;
		/** Penuhi tinggi layar (untuk layar tunggu penuh seperti boot aplikasi). */
		full?: boolean;
		class?: string;
	} = $props();
</script>

<div
	class="flex w-full items-center justify-center {full
		? 'min-h-screen'
		: 'min-h-[50vh] py-16'} {className}"
	role="status"
	aria-live="polite"
>
	<div class="flex flex-col items-center gap-3">
		<span class="loader" aria-hidden="true"></span>
		<p class="text-muted text-sm font-bold">{label}</p>
		{#if hint}
			<p class="text-faint font-mono text-xs">{hint}</p>
		{/if}
	</div>
</div>

<style>
	.loader {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		border: 3px solid var(--theme-border-color);
		border-top-color: var(--theme-accent-primary);
		animation: rice-spin 0.7s linear infinite;
	}

	@keyframes rice-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loader {
			animation-duration: 2.4s;
		}
	}
</style>
