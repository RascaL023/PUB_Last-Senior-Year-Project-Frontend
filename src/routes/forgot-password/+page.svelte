<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores';

	let email = $state('');
	let busy = $state(false);
	let sent = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!email.trim()) return;
		busy = true;
		try {
			await session.forgotPassword(email.trim());
			sent = true;
		} catch {
			// Toast sudah ditampilkan
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Lupa Password — Hysteria Cafe</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen items-center justify-center px-4 py-10">
	<section
		class="border-line bg-card rounded-card shadow-rice border-rice w-full max-w-md p-6 sm:p-8"
		aria-labelledby="forgot-title"
	>
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Lupa Password</p>
		<h1 id="forgot-title" class="text-ink font-display text-2xl font-extrabold">Reset Kata Sandi</h1>
		<p class="text-muted mt-1 text-sm">Masukkan email kamu untuk menerima link reset password.</p>

		{#if sent}
			<div class="mt-6 text-center">
				<div class="bg-leaf/10 border border-leaf rounded-card p-6">
					<p class="text-leaf text-sm font-bold">Link reset password telah dikirim ke email kamu.</p>
					<p class="text-muted mt-2 text-sm">Periksa inbox dan ikuti instruksinya.</p>
					<button
						type="button"
						onclick={() => goto('/login')}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-4 px-4 py-2 text-sm font-bold"
					>
						Kembali ke Masuk
					</button>
				</div>
			</div>
		{:else}
			<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
				<div>
					<label for="forgot-email" class="text-ink mb-1 block text-xs font-bold">Email</label>
					<input
						id="forgot-email"
						type="email"
						autocomplete="email"
						placeholder="nama@email.com"
						bind:value={email}
						disabled={busy}
						required
						class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
					/>
				</div>

				<button
					type="submit"
					disabled={busy}
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
				>
					{busy ? 'Mengirim…' : 'Kirim Link'}
				</button>
			</form>

			<p class="text-muted mt-6 text-center text-sm">
				Ingat passwordmu?
				<a href="/login" class="text-accent font-bold hover:underline">Masuk</a>
			</p>
		{/if}
	</section>
</main>
