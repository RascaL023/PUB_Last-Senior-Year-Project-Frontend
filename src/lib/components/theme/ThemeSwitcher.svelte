<script lang="ts">
	import { onMount } from 'svelte';
	import { THEMES, themeStore, type ThemeId } from '$lib/theme/theme.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { compact = false }: { compact?: boolean } = $props();
	let activePanel = $state<'theme' | null>(null);
	let root = $state<HTMLDivElement>();
	const panelId = 'theme-switcher-panel';

	const short: Record<ThemeId, string> = {
		kanagawa: 'Kana',
		'glass-cafe': 'Glass',
		neurobrutalism: 'Neuro',
		dribbble: 'Dribb'
	};

	function togglePanel() {
		activePanel = activePanel === 'theme' ? null : 'theme';
	}

	function chooseTheme(theme: ThemeId, e: MouseEvent) {
		themeStore.setTheme(theme, { x: e.clientX, y: e.clientY });
		activePanel = null;
	}

	onMount(() => {
		function handlePointerDown(event: PointerEvent) {
			if (activePanel !== 'theme' || root?.contains(event.target as Node)) return;
			activePanel = null;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') activePanel = null;
		}

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if compact}
	<div class="theme-menu relative" bind:this={root}>
		<button
			type="button"
			onclick={togglePanel}
			title="Pilih tema (saat ini: {themeStore.current})"
			aria-label="Pilih tema, saat ini {themeStore.current}"
			aria-controls={panelId}
			aria-expanded={activePanel === 'theme'}
			class="theme-trigger border-line text-muted hover:text-ink rounded-pill border-rice rice-press rice-ghost shadow-ricesm px-3 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-primary)]"
			class:is-open={activePanel === 'theme'}
		>
			<Icon name="palette" class="h-4 w-4" /> {short[themeStore.current]}
		</button>

		<div
			id={panelId}
			class="theme-panel-clip absolute right-0 z-50"
			class:is-open={activePanel === 'theme'}
			aria-hidden={activePanel !== 'theme'}
		>
			<div class="theme-panel border-line bg-shell border-rice backdrop-blur-rice">
				<div class="theme-panel-content">
					{#each THEMES as theme (theme.id)}
						<button
							type="button"
							onclick={(e) => chooseTheme(theme.id, e)}
							aria-pressed={themeStore.current === theme.id}
							tabindex={activePanel === 'theme' ? 0 : -1}
							class="theme-option text-muted hover:text-ink rounded-btn border-rice border-line rice-press bg-subtle px-3 py-2 text-left text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-primary)]"
							class:is-current={themeStore.current === theme.id}
						>
							<span>{theme.label}</span>
							{#if themeStore.current === theme.id}
								<Icon name="check" class="h-3 w-3" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="border-line bg-card text-ink shadow-rice rounded-card border-rice flex items-center gap-2 p-2">
		{#each THEMES as theme (theme.id)}
			<button
				type="button"
				onclick={(e) => themeStore.setTheme(theme.id, { x: e.clientX, y: e.clientY })}
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
{/if}

<style>
	.theme-menu {
		--panel-overlap: 5px;
		--panel-duration: 200ms;
		--panel-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
		--trigger-w: 5.75rem;
	}

	.theme-trigger {
		background: var(--theme-bg-subtle);
		position: relative;
		z-index: 60;
	}

	.theme-trigger.is-open {
		background: var(--theme-bg-shell);
		border-bottom-color: transparent;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		box-shadow: none;
		transform: none;
	}

	.theme-panel-clip {
		top: calc(100% - var(--panel-overlap));
		width: min(21rem, calc(100vw - 1rem));
		overflow: clip;
		pointer-events: none;
		clip-path: inset(0 0 100% 0);
		transform-origin: top;
		transition: clip-path var(--panel-duration) var(--panel-ease-out);
	}

	.theme-panel-clip.is-open {
		pointer-events: auto;
		clip-path: inset(0);
	}

	.theme-panel {
		position: relative;
		border-radius: 0 0 var(--theme-radius-card) var(--theme-radius-card);
		background: var(--theme-bg-shell);
		box-shadow: 0 18px 34px -18px rgba(0, 0, 0, 0.65);
		padding: calc(var(--panel-overlap) + 0.5rem) 0.5rem 0.5rem;
		transform: scaleY(0.98);
		transform-origin: top;
		transition: transform var(--panel-duration) var(--panel-ease-out);
	}

	.theme-panel::before {
		content: '';
		position: absolute;
		top: calc(-1 * var(--panel-overlap));
		right: calc(-1 * var(--theme-border-w));
		width: calc(var(--trigger-w) + 1rem);
		height: calc(var(--panel-overlap) + var(--theme-border-w));
		background: var(--theme-bg-shell);
		border-top-left-radius: var(--theme-radius-btn);
		pointer-events: none;
	}

	.theme-panel-clip.is-open .theme-panel {
		transform: scaleY(1);
	}

	.theme-panel-content {
		display: grid;
		gap: 0.25rem;
		transform: translateY(-0.25rem);
		opacity: 0;
		transition:
			opacity var(--panel-duration) var(--panel-ease-out),
			transform var(--panel-duration) var(--panel-ease-out);
	}

	.theme-panel-clip.is-open .theme-panel-content {
		opacity: 1;
		transform: translateY(0);
	}

	.theme-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 2.5rem;
		border-color: transparent;
		background: color-mix(in srgb, var(--theme-bg-subtle) 58%, transparent);
		box-shadow: none;
	}

	.theme-option:hover {
		background: var(--theme-bg-card-hover);
	}

	.theme-option.is-current {
		background: var(--theme-accent-primary);
		color: var(--theme-text-inverted);
		border-color: var(--theme-border-color);
	}

	:global([data-theme='glass-cafe']) .theme-panel {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04) 32%),
			var(--theme-bg-overlay);
		border-color: rgba(255, 255, 255, 0.22);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.14),
			0 24px 60px -24px rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(var(--theme-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--theme-blur)) saturate(180%);
	}

	:global([data-theme='glass-cafe']) .theme-panel::before {
		background: var(--theme-bg-overlay);
	}

	:global([data-theme='glass-cafe']) .theme-option:not(.is-current) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--theme-text-main);
		backdrop-filter: blur(calc(var(--theme-blur) / 2));
		-webkit-backdrop-filter: blur(calc(var(--theme-blur) / 2));
	}

	:global([data-theme='glass-cafe']) .theme-option:not(.is-current):hover {
		background: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.22);
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-panel-clip,
		.theme-panel,
		.theme-panel-content {
			transition: none;
			transform: none;
		}
	}
</style>
