<script lang="ts">
	import { THEMES, themeStore } from '$lib/theme/theme.svelte';
</script>

<div class="border-line bg-card text-ink shadow-rice rounded-card border-rice flex items-center gap-2 p-2">
	{#each THEMES as theme (theme.id)}
		<button
			type="button"
			onclick={() => themeStore.setTheme(theme.id)}
			aria-pressed={themeStore.current === theme.id}
			class="rounded-btn border-rice rice-press px-3 py-1.5 text-xs font-bold
				{themeStore.current === theme.id
				? 'border-line bg-accent text-inverted'
				: 'border-line bg-subtle text-muted hover:text-ink'}"
		>
			{theme.label}
		</button>
	{/each}
</div>
