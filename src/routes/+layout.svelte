<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => themeStore.init());
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
