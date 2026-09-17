<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session } from '$lib/stores';
	import { getFriendlyMessage } from '$lib/core/http/error-messages';
	import { AppError } from '$lib/core/http/http-errors';

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '/');
	const loginHref = $derived(
		redirectTo === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(redirectTo)}`
	);

	$effect(() => {
		if (session.status === 'ready') void goto(redirectTo);
	});

	function validate(): boolean {
		const errors: Record<string, string> = {};
		if (name.trim().length < 2) {
			errors.name = 'Masukkan nama lengkapmu.';
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			errors.email = 'Masukkan alamat email yang valid.';
		}
		if (password.length < 8) {
			errors.password = 'Kata sandi minimal 8 karakter.';
		} else if (password !== confirmPassword) {
			errors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
		}
		if (phone.trim().length > 0 && !/^[+0-9][0-9\s-]{5,19}$/.test(phone.trim())) {
			errors.phone = 'Nomor telepon tidak valid.';
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
			await session.registerCustomer({
				name: name.trim(),
				email: email.trim(),
				password,
				...(phone.trim().length > 0 ? { phone: phone.trim() } : {})
			});
			await goto(redirectTo);
		} catch (e) {
			if (e instanceof AppError && e.status === 409) {
				fieldErrors = { email: 'Email sudah terdaftar. Silakan masuk.' };
				formError = 'Email sudah terdaftar. Silakan masuk.';
			} else if (e instanceof AppError && e.fieldErrors.length > 0) {
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
	<title>Daftar — Hysteria Cafe</title>
</svelte:head>

<main class="font-theme bg-app text-ink flex min-h-screen items-center justify-center px-4 py-10">
	<section
		class="border-line bg-card rounded-card shadow-rice border-rice w-full max-w-md p-6 sm:p-8"
		aria-labelledby="register-title"
	>
		<p class="text-accent mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">— Daftar</p>
		<h1 id="register-title" class="text-ink font-display text-2xl font-extrabold">Buat akun pelanggan</h1>
		<p class="text-muted mt-1 text-sm">Satu akun untuk memesan dan melacak pesananmu.</p>

		{#if formError}
			<p role="alert" class="bg-danger text-inverted rounded-btn mt-4 px-3 py-2 text-sm font-bold">
				{formError}
			</p>
		{/if}

		<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
			<div>
				<label for="reg-name" class="text-ink mb-1 block text-xs font-bold">Nama lengkap</label>
				<input
					id="reg-name"
					type="text"
					autocomplete="name"
					placeholder="Nama kamu"
					bind:value={name}
					disabled={busy}
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
				{#if fieldErrors.name}
					<p class="text-danger mt-1 text-xs">{fieldErrors.name}</p>
				{/if}
			</div>

			<div>
				<label for="reg-email" class="text-ink mb-1 block text-xs font-bold">Email</label>
				<input
					id="reg-email"
					type="email"
					autocomplete="email"
					placeholder="nama@email.com"
					bind:value={email}
					disabled={busy}
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
				{#if fieldErrors.email}
					<p class="text-danger mt-1 text-xs">{fieldErrors.email}</p>
				{/if}
			</div>

			<div>
				<label for="reg-phone" class="text-ink mb-1 block text-xs font-bold">
					Telepon <span class="text-faint font-normal">(opsional)</span>
				</label>
				<input
					id="reg-phone"
					type="tel"
					autocomplete="tel"
					placeholder="08xxxxxxxxxx"
					bind:value={phone}
					disabled={busy}
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
				{#if fieldErrors.phone}
					<p class="text-danger mt-1 text-xs">{fieldErrors.phone}</p>
				{/if}
			</div>

			<div>
				<label for="reg-password" class="text-ink mb-1 block text-xs font-bold">Kata sandi</label>
				<div class="relative">
					<input
						id="reg-password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
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
				{#if fieldErrors.password}
					<p class="text-danger mt-1 text-xs">{fieldErrors.password}</p>
				{/if}
			</div>

			<div>
				<label for="reg-confirm" class="text-ink mb-1 block text-xs font-bold">Konfirmasi kata sandi</label>
				<input
					id="reg-confirm"
					type={showPassword ? 'text' : 'password'}
					autocomplete="new-password"
					placeholder="Ulangi kata sandi"
					bind:value={confirmPassword}
					disabled={busy}
					class="bg-subtle text-ink rounded-btn border-rice border-line w-full px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
				/>
				{#if fieldErrors.confirmPassword}
					<p class="text-danger mt-1 text-xs">{fieldErrors.confirmPassword}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={busy}
				class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
			>
				{busy ? 'Memproses…' : 'Daftar'}
			</button>
		</form>

		<p class="text-muted mt-6 text-center text-sm">
			Sudah punya akun?
			<a href={loginHref} class="text-accent font-bold hover:underline">Masuk</a>
		</p>
	</section>
</main>
