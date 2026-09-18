<script lang="ts">
	let { name, class: className }: { name: string; class?: string } = $props();
</script>

{#if name === 'coffee'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
		<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
		<line x1="6" y1="2" x2="6" y2="4"/>
		<line x1="10" y1="2" x2="10" y2="4"/>
		<line x1="14" y1="2" x2="14" y2="4"/>
	</svg>
{:else if name === 'cart'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<circle cx="9" cy="21" r="1"/>
		<circle cx="20" cy="21" r="1"/>
		<path d="m1 1 4 4h16l-2 9H7L5 5"/>
	</svg>
{:else if name === 'close'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<line x1="18" y1="6" x2="6" y2="18"/>
		<line x1="6" y1="6" x2="18" y2="18"/>
	</svg>
{:else if name === 'check'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<polyline points="20 6 9 17 4 12"/>
	</svg>
{:else if name === 'leaf'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/>
		<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
	</svg>
{:else if name === 'bread'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M19 8h.3a2 2 0 0 0 0-4H15m-6 0H5.3a2 2 0 0 0 0 4H13m-6 0H3a2 2 0 0 0 0 4h13m0 0h.3a2 2 0 0 0 0-4H11"/>
		<path d="M12 12v9"/>
		<path d="M8 12v9"/>
		<path d="M16 12v9"/>
	</svg>
{:else if name === 'music'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M9 18V5l12-2v13"/>
		<circle cx="6" cy="18" r="3"/>
		<circle cx="18" cy="16" r="3"/>
	</svg>
{:else if name === 'search'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<circle cx="11" cy="11" r="8"/>
		<line x1="21" y1="21" x2="16.65" y2="16.65"/>
	</svg>
{:else if name === 'palette'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
		<circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
		<circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
		<circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
		<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
	</svg>
{/if}

<style>
	svg {
		display: inline-block;
		vertical-align: middle;
	}
</style>