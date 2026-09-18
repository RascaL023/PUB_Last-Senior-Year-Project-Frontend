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
{:else if name === 'dashboard'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<rect x="3" y="3" width="7" height="7"/>
		<rect x="14" y="3" width="7" height="7"/>
		<rect x="14" y="14" width="7" height="7"/>
		<rect x="3" y="14" width="7" height="7"/>
	</svg>
{:else if name === 'receipt'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
		<line x1="8" y1="7" x2="16" y2="7"/>
		<line x1="8" y1="11" x2="16" y2="11"/>
	</svg>
{:else if name === 'table'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<rect x="3" y="4" width="18" height="4"/>
		<line x1="6" y1="8" x2="6" y2="20"/>
		<line x1="18" y1="8" x2="18" y2="20"/>
	</svg>
{:else if name === 'wallet'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M20 7H4a2 2 0 0 1 0-4h14v4"/>
		<path d="M4 7v12a2 2 0 0 0 2 2h14V7"/>
		<circle cx="16.5" cy="14" r="1"/>
	</svg>
{:else if name === 'kitchen'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M6 13.87A4 4 0 1 1 7.41 6a5.11 5.11 0 0 1 9.18 0A4 4 0 1 1 18 13.87V21H6Z"/>
		<line x1="6" y1="17" x2="18" y2="17"/>
	</svg>
{:else if name === 'floor'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M9 20 3.5 17.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20z"/>
		<line x1="9" y1="7" x2="9" y2="20"/>
		<line x1="15" y1="4.5" x2="15" y2="17.5"/>
	</svg>
{:else if name === 'user'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
		<circle cx="12" cy="7" r="4"/>
	</svg>
{:else if name === 'logout'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
		<polyline points="16 17 21 12 16 7"/>
		<line x1="21" y1="12" x2="9" y2="12"/>
	</svg>
{:else if name === 'plus'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<line x1="12" y1="5" x2="12" y2="19"/>
		<line x1="5" y1="12" x2="19" y2="12"/>
	</svg>
{:else if name === 'minus'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<line x1="5" y1="12" x2="19" y2="12"/>
	</svg>
{:else if name === 'trash'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<polyline points="3 6 5 6 21 6"/>
		<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
	</svg>
{:else if name === 'chevron-left'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<polyline points="15 18 9 12 15 6"/>
	</svg>
{:else if name === 'info'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<circle cx="12" cy="12" r="10"/>
		<line x1="12" y1="16" x2="12" y2="12"/>
		<line x1="12" y1="8" x2="12.01" y2="8"/>
	</svg>
{:else if name === 'clock'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<circle cx="12" cy="12" r="10"/>
		<polyline points="12 6 12 12 16 14"/>
	</svg>
{:else if name === 'heart'}
	<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
	</svg>
{/if}

<style>
	svg {
		display: inline-block;
		vertical-align: middle;
	}
</style>