<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores';
	import { getFriendlyMessage } from '$lib/core/http/error-messages';
	import { AppError } from '$lib/core/http/http-errors';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '/');
	const registerHref = $derived(
		redirectTo === '/' ? '/register' : `/register?redirectTo=${encodeURIComponent(redirectTo)}`
	);

	$effect(() => {
		if (session.status === 'ready') void goto(redirectTo);
	});

	function validate(): boolean {
		const errors: Record<string, string> = {};
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Masukkan alamat email yang valid.';
		}
		if (password.length < 8) {
			errors.password = 'Kata sandi minimal 8 karakter.';
		}
		fieldErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = null;
		if (!validate()) return;
		busy = true;
		try {
			await session.login(email.trim(), password);
			await goto(redirectTo);
		} catch (e) {
			if (e instanceof AppError && e.fieldErrors.length > 0) {
				const mapped: Record<string, string> = {};
				for (const f of e.fieldErrors) mapped[f.field] = f.message;
				fieldErrors = mapped;
				formError = 'Periksa kembali isian formulir.';
			} else {
				formError = getFriendlyMessage(e);
			}
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk — Kopi Rustik</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen items-center justify-center px-4 py-10">
	<section
		class="border-line bg-card rounded-card shadow-rice border-rice w-full max-w-md p-6 sm:p-8"
		aria-labelledby="login-title"
	>
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Masuk</p>
		<h1 id="login-title" class="text-ink font-display text-2xl font-extrabold">Selamat datang kembali</h1>
		<p class="text-muted mt-1 text-sm">Masuk untuk memesan dan melacak pesananmu.</p>

		{#if formError}
			<p role="alert" class="bg-danger text-inverted rounded-btn mt-4 px-3 py-2 text-sm font-bold">
				{formError}
			</p>
		{/if}

		<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
			<div>
				<label for="login-email" class="text-ink mb-1 block text-xs font-bold">Email</label>
				<input
					id="login-email"
					type="email"
					autocomplete="email"
					placeholder="nama@email.com"
					bind:value={email}
					disabled={busy}
					aria-invalid={fieldErrors.email ? 'true' : undefined}
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
				{#if fieldErrors.email}
					<p class="text-danger mt-1 text-xs">{fieldErrors.email}</p>
				{/if}
			</div>

			<div>
				<label for="login-password" class="text-ink mb-1 block text-xs font-bold">Kata sandi</label>
				<div class="relative">
					<input
						id="login-password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						placeholder="Minimal 8 karakter"
						bind:value={password}
						disabled={busy}
						aria-invalid={fieldErrors.password ? 'true' : undefined}
						class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 pr-16 text-sm outline-none placeholder:text-faint focus:border-accent"
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						disabled={busy}
						class="text-muted hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 px-2 py-1 text-xs font-bold"
					>
						{showPassword ? 'Sembunyi' : 'Lihat'}
					</button>
				</div>
				{#if fieldErrors.password}
					<p class="text-danger mt-1 text-xs">{fieldErrors.password}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={busy}
				class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
			>
				{busy ? 'Memproses…' : 'Masuk'}
			</button>
		</form>

		<p class="text-muted mt-6 text-center text-sm">
			Belum punya akun?
			<a href={registerHref} class="text-accent font-bold hover:underline">Daftar</a>
		</p>

		{#if import.meta.env.DEV}
			<p class="bg-subtle text-faint rounded-btn mt-4 px-3 py-2 font-mono text-[11px]">
				dev: admin@rascal.id / admin123
			</p>
		{/if}
	</section>
</main>
