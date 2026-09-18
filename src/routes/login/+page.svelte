<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores';
	import { AppError } from '$lib/core/http/http-errors';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let busy = $state(false);

	/** Hanya izinkan path internal — cegah open redirect lewat ?redirectTo=. */
	function safeRedirect(value: string | null): string | null {
		if (!value) return null;
		if (!value.startsWith('/') || value.startsWith('//')) return null;
		return value;
	}

	const explicitRedirect = $derived(
		safeRedirect(page.url.searchParams.get('redirectTo') ?? page.url.searchParams.get('next'))
	);
	const hasExplicitRedirect = $derived(explicitRedirect !== null);
	const redirectTo = $derived(explicitRedirect ?? '/');
	const registerHref = $derived(
		redirectTo === '/' && !hasExplicitRedirect
			? '/register'
			: `/register?redirectTo=${encodeURIComponent(redirectTo)}`
	);

	$effect(() => {
		if (session.status === 'ready' && session.user) {
			void goto(hasExplicitRedirect ? redirectTo : session.resolveLanding());
		}
	});

	function validate(): boolean {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			return false;
		}
		if (password.length < 8) {
			return false;
		}
		return true;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!validate()) return;
		busy = true;
		try {
			await session.login(email.trim(), password);
			if (hasExplicitRedirect) {
				await goto(redirectTo);
			} else {
				await goto(session.resolveLanding());
			}
		} catch {
			// Toast sudah ditampilkan oleh session.login()
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk — Hysteria Cafe</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen items-center justify-center px-4 py-10">
	<section
		class="border-line bg-card rounded-card shadow-rice border-rice w-full max-w-md p-6 sm:p-8"
		aria-labelledby="login-title"
	>
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Masuk</p>
		<h1 id="login-title" class="text-ink font-display text-2xl font-extrabold">Selamat datang kembali</h1>
		<p class="text-muted mt-1 text-sm">Masuk untuk memesan dan melacak pesananmu.</p>

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
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
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

		<p class="text-muted mt-2 text-center text-sm">
			Lupa password?
			<a href="/forgot-password" class="text-accent font-bold hover:underline">Reset di sini</a>
		</p>

		{#if import.meta.env.DEV}
			<p class="bg-subtle text-faint rounded-btn mt-4 px-3 py-2 font-mono text-[11px]">
				dev: admin@rascal.id / admin123
			</p>
		{/if}
	</section>
</main>
