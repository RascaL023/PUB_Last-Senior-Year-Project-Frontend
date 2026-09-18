<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores';

	let token = $derived(page.url.searchParams.get('token') ?? '');
	let password = $state('');
	let confirmPassword = $state('');
	let busy = $state(false);
	let success = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!token || password.length < 8 || password !== confirmPassword) return;
		busy = true;
		try {
			await session.resetPassword(token, password);
			success = true;
		} catch {
			// Toast sudah ditampilkan
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Reset Password — Hysteria Cafe</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen items-center justify-center px-4 py-10">
	<section
		class="border-line bg-card rounded-card shadow-rice border-rice w-full max-w-md p-6 sm:p-8"
		aria-labelledby="reset-title"
	>
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Reset Password</p>
		<h1 id="reset-title" class="text-ink font-display text-2xl font-extrabold">Buat Kata Sandi Baru</h1>
		<p class="text-muted mt-1 text-sm">Masukkan kata sandi baru kamu.</p>

		{#if success}
			<div class="mt-6 text-center">
				<div class="bg-leaf/10 border border-leaf rounded-card p-6">
					<p class="text-leaf text-sm font-bold">Password berhasil direset!</p>
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
					<label for="reset-password" class="text-ink mb-1 block text-xs font-bold">Kata Sandi Baru</label>
					<div class="relative">
						<input
							id="reset-password"
							type={password ? 'text' : 'password'}
							autocomplete="new-password"
							placeholder="Minimal 8 karakter"
							bind:value={password}
							disabled={busy}
							required
							minlength={8}
							class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 pr-16 text-sm outline-none placeholder:text-faint focus:border-accent"
						/>
					</div>
				</div>

				<div>
					<label for="reset-confirm" class="text-ink mb-1 block text-xs font-bold">Konfirmasi Kata Sandi</label>
					<input
						id="reset-confirm"
						type={confirmPassword ? 'text' : 'password'}
						autocomplete="new-password"
						placeholder="Ulangi kata sandi"
						bind:value={confirmPassword}
						disabled={busy}
						required
						minlength={8}
						class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
					/>
				</div>

				<button
					type="submit"
					disabled={busy || !token}
					class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
				>
					{busy ? 'Memproses…' : 'Reset Password'}
				</button>
			</form>

			{#if !token}
				<p class="text-danger mt-4 text-center text-sm">Link reset tidak valid. Minta link baru melalui email.</p>
			{/if}

			<p class="text-muted mt-6 text-center text-sm">
				<a href="/login" class="text-accent font-bold hover:underline">Kembali ke Masuk</a>
			</p>
		{/if}
	</section>
</main>
