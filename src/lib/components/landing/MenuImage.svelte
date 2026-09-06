<script lang="ts">
	let {
		src,
		alt,
		fallback = '/images/menu-placeholder.png',
		wrapperClass = 'h-48 w-full'
	}: {
		src: string | null;
		alt: string;
		fallback?: string;
		wrapperClass?: string;
	} = $props();

	let current = $state('');
	let loaded = $state(false);

	$effect(() => {
		current = src ?? fallback;
		loaded = false;
	});
</script>

<div class="{wrapperClass} bg-subtle relative overflow-hidden">
	{#if !loaded}
		<div class="skeleton-shimmer absolute inset-0" aria-hidden="true"></div>
	{/if}
	<img
		src={current}
		{alt}
		loading="lazy"
		decoding="async"
		onload={() => (loaded = true)}
		onerror={() => {
			if (current !== fallback) current = fallback;
			else loaded = true;
		}}
		class="h-full w-full object-cover transition-opacity duration-500 {loaded ? 'opacity-100' : 'opacity-0'}"
	/>
</div>
