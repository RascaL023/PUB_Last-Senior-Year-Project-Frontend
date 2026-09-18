<script lang="ts">
	import { session } from '$lib/stores';
	import DiningManager from '$lib/components/dining/DiningManager.svelte';
</script>

{#if session.status === 'ready' && session.user}
	<DiningManager />
{:else}
	<div class="bg-app text-ink min-h-screen flex items-center justify-center">
		<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
			<h2 class="font-display text-ink text-xl font-extrabold mb-2">Akses Dibatasi</h2>
			<p class="text-muted text-sm font-bold">Silakan login terlebih dahulu untuk mengakses manajemen meja.</p>
		</div>
	</div>
{/if}
