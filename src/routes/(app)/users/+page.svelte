<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import type { UserAuthResponse } from '$lib/domain/user';
	import type { RoleResponse } from '$lib/domain/role';
	import type { AuthorityResponse } from '$lib/domain/authority';
	import type { AppError } from '$lib/core/http/http-errors';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';

	const api = getApi();

	let tab = $state<'users' | 'roles' | 'authorities'>('users');

	let users = $state<UserAuthResponse[]>([]);
	let usersError: AppError | null = $state(null);
	let usersLoading = $state(false);
	let userEmail = $state('');
	let userPassword = $state('');
	let userRoleIds = $state<number[]>([]);
	let userEditingId = $state<number | null>(null);

	let roles = $state<RoleResponse[]>([]);
	let rolesError: AppError | null = $state(null);
	let rolesLoading = $state(false);
	let roleName = $state('');
	let roleAuthorityIds = $state<number[]>([]);
	let roleEditingId = $state<number | null>(null);

	let authorities = $state<AuthorityResponse[]>([]);
	let authError: AppError | null = $state(null);
	let authLoading = $state(false);
	let authKeyword = $state('');

	const can = (authority: string): boolean =>
		session.hasAuthority(authority) || session.hasAuthority(authority.replace(/\.\w+$/, '.*'));
	// BE memakai @PreAuthorize user.*/role.*/authority.* untuk ketiga tab di bawah.
	const canUsers = $derived(can('user.read'));
	const canUserWrite = $derived(
		can('user.create') || can('user.update') || can('user.delete')
	);
	const canRoleWrite =
		$derived(can('role.create') || can('role.update') || can('role.delete'));
	const canRoleRead = $derived(can('role.read'));
	const canAuthRead = $derived(can('authority.read'));
	const canAuthDelete = $derived(can('authority.delete'));
	const canAnyTab = $derived(canUsers || canRoleRead || canAuthRead);
	const tabs = $derived(
		(
			[
				{ id: 'users', label: 'Pengguna', show: canUsers },
				{ id: 'roles', label: 'Peran', show: canRoleRead },
				{ id: 'authorities', label: 'Otoritas', show: canAuthRead }
			] as { id: 'users' | 'roles' | 'authorities'; label: string; show: boolean }[]
		).filter((item) => item.show)
	);

	async function loadUsers() {
		if (!canUsers) return;
		usersLoading = true;
		usersError = null;
		try {
			const result = await api.users.list({ size: 50 });
			users = result.items;
		} catch (e) {
			usersError = toAppError(e);
		} finally {
			usersLoading = false;
		}
	}

	async function loadRoles() {
		if (!canRoleRead) return;
		rolesLoading = true;
		rolesError = null;
		try {
			const result = await api.roles.list({ size: 100 });
			roles = result.items;
		} catch (e) {
			rolesError = toAppError(e);
		} finally {
			rolesLoading = false;
		}
	}

	async function loadAuthorities() {
		if (!canAuthRead) return;
		authLoading = true;
		authError = null;
		try {
			const result = await api.authorities.list({
				size: 100,
				name: authKeyword.trim() || undefined
			});
			authorities = result.items;
		} catch (e) {
			authError = toAppError(e);
		} finally {
			authLoading = false;
		}
	}

	function toggle(list: number[], id: number): number[] {
		return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
	}

	async function saveUser() {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
			toastStore.show('Format email tidak valid.', 'warning');
			return;
		}
		if (userEditingId === null && userPassword.length < 8) {
			toastStore.show('Password minimal 8 karakter.', 'warning');
			return;
		}
		if (userRoleIds.length === 0) {
			toastStore.show('Pilih minimal 1 peran.', 'warning');
			return;
		}
		try {
			if (userEditingId !== null) {
				const payload: { email?: string; password?: string; roleIds?: number[] } = {
					email: userEmail.trim(),
					roleIds: userRoleIds
				};
				if (userPassword.length > 0) payload.password = userPassword;
				if (Object.keys(payload).length === 0) return;
				await api.users.patch(userEditingId, payload);
				toastStore.show('Pengguna diperbarui.', 'success');
			} else {
				await api.users.create({
					email: userEmail.trim(),
					password: userPassword,
					roleIds: userRoleIds
				});
				toastStore.show('Pengguna dibuat.', 'success');
			}
			userEmail = '';
			userPassword = '';
			userRoleIds = [];
			userEditingId = null;
			await loadUsers();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function deleteUser(id: number, email: string) {
		if (!confirm(`Hapus pengguna "${email}"?`)) return;
		try {
			await api.users.remove(id);
			toastStore.show('Pengguna dihapus.', 'success');
			await loadUsers();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function saveRole() {
		const name = roleName.trim().toUpperCase();
		if (name.length < 3 || name.length > 20) {
			toastStore.show('Nama peran 3–20 karakter.', 'warning');
			return;
		}
		if (roleAuthorityIds.length === 0) {
			toastStore.show('Pilih minimal 1 authority.', 'warning');
			return;
		}
		try {
			if (roleEditingId !== null) {
				await api.roles.update(roleEditingId, { name, authorityIds: roleAuthorityIds });
				toastStore.show('Peran diperbarui.', 'success');
			} else {
				await api.roles.create({ name, authorityIds: roleAuthorityIds });
				toastStore.show('Peran dibuat.', 'success');
			}
			roleName = '';
			roleAuthorityIds = [];
			roleEditingId = null;
			await loadRoles();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function deleteRole(id: number, name: string) {
		if (!confirm(`Hapus peran "${name}"?`)) return;
		try {
			await api.roles.remove(id);
			toastStore.show('Peran dihapus.', 'success');
			await loadRoles();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	async function deleteAuthority(id: number, name: string) {
		if (!confirm(`Hapus authority "${name}"?`)) return;
		try {
			await api.authorities.remove(id);
			toastStore.show('Authority dihapus.', 'success');
			await loadAuthorities();
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	$effect(() => {
		// Pindahkan tab aktif ke tab pertama yang boleh dibuka user.
		if (tabs.length > 0 && !tabs.some((item) => item.id === tab)) {
			tab = tabs[0].id;
			return;
		}
		if (tab === 'users') void loadUsers();
		else if (tab === 'roles') {
			void loadRoles();
			void loadAuthorities();
		} else void loadAuthorities();
	});
</script>

<svelte:head>
	<title>Pengguna & Peran — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		<h2 class="font-display text-ink mb-4 text-2xl font-extrabold tracking-tight">Pengguna & Peran</h2>

		<div class="mb-4 flex flex-wrap gap-2">
			{#each tabs as t (t.id)}
				<button
					type="button"
					onclick={() => (tab = t.id)}
					aria-pressed={tab === t.id}
					class="rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold
						{tab === t.id ? 'bg-accent text-inverted' : 'bg-subtle text-muted hover:text-ink'}"
				>
					{t.label}
				</button>
			{/each}
		</div>

		{#if !canAnyTab}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="user" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h3 class="font-display text-ink mb-2 text-lg font-extrabold">Akses Dibatasi</h3>
				<p class="text-muted text-sm font-bold">
					Anda tidak memiliki izin mengelola pengguna, peran, atau otoritas.
				</p>
			</div>
		{:else if tab === 'users'}
			{#if usersError}
				<div class="mb-4">
					<ErrorState
						code={usersError.status}
						title="Gagal Memuat Pengguna"
						message={usersError.message}
						onRetry={() => loadUsers()}
					/>
				</div>
			{/if}
			{#if canUserWrite}
			<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
				<h3 class="font-display text-ink mb-3 text-base font-bold">
					{userEditingId !== null ? 'Ubah Pengguna' : 'Pengguna Baru'}
				</h3>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs font-bold text-ink">
						Email
						<input
							type="email"
							bind:value={userEmail}
							class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs font-bold text-ink">
						Password {userEditingId !== null ? '(kosongkan bila tak diubah)' : '(min 8)'}
						<input
							type="password"
							bind:value={userPassword}
							autocomplete="new-password"
							class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
						/>
					</label>
				</div>
				<p class="text-ink mt-3 mb-1 text-xs font-bold">Peran</p>
				<div class="mb-3 flex flex-wrap gap-1">
					{#each roles as role (role.id)}
						<button
							type="button"
							onclick={() => (userRoleIds = toggle(userRoleIds, role.id))}
							class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs font-bold
								{userRoleIds.includes(role.id) ? 'bg-accent text-inverted' : 'bg-subtle text-muted'}"
						>
							{role.name}
						</button>
					{/each}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={saveUser}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
					>
						Simpan
					</button>
					{#if userEditingId !== null}
						<button
							type="button"
							onclick={() => {
								userEditingId = null;
								userEmail = '';
								userPassword = '';
								userRoleIds = [];
							}}
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
						>
							Batal
						</button>
					{/if}
				</div>
			</div>
			{/if}
			{#if usersLoading}
				<div class="text-muted py-12 text-center">Memuat pengguna...</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Email</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Peran</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user (user.id)}
								<tr class="border-line border-rice border-b">
									<td class="text-ink px-4 py-3 font-mono text-xs">{user.email}</td>
									<td class="px-4 py-3">
										<div class="flex flex-wrap gap-1">
											{#each user.roles as role}
												<span class="bg-subtle text-muted rounded-pill px-2 py-0.5 font-mono text-xs font-bold">
													{role.name}
												</span>
											{/each}
										</div>
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex justify-end gap-2">
											<button
												type="button"
												onclick={() => {
													userEditingId = user.id;
													userEmail = user.email;
													userPassword = '';
													userRoleIds = user.roles.map((r) => r.id);
												}}
												class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
											>
												Ubah
											</button>
											<button
												type="button"
												onclick={() => deleteUser(user.id, user.email)}
												class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
											>
												Hapus
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else if tab === 'roles'}
			{#if !canRoleRead}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat peran.</p>
				</div>
			{:else}
				{#if rolesError}
					<div class="mb-4">
						<ErrorState
							code={rolesError.status}
							title="Gagal Memuat Peran"
							message={rolesError.message}
							onRetry={() => loadRoles()}
						/>
					</div>
				{/if}
				{#if canRoleWrite}
					<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
						<h3 class="font-display text-ink mb-3 text-base font-bold">
							{roleEditingId !== null ? 'Ubah Peran' : 'Peran Baru'}
						</h3>
						<label class="flex max-w-sm flex-col gap-1 text-xs font-bold text-ink">
							Nama peran (3–20, huruf besar)
							<input
								type="text"
								bind:value={roleName}
								maxlength="20"
								placeholder="cth. SUPERVISOR"
								class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 font-mono text-sm outline-none placeholder:text-faint"
							/>
						</label>
						<p class="text-ink mt-3 mb-1 text-xs font-bold">Authority</p>
						<div class="mb-3 flex max-h-48 flex-wrap gap-1 overflow-y-auto">
							{#each authorities as auth (auth.id)}
								<button
									type="button"
									onclick={() => (roleAuthorityIds = toggle(roleAuthorityIds, auth.id))}
									class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs
										{roleAuthorityIds.includes(auth.id) ? 'bg-accent text-inverted font-bold' : 'bg-subtle text-muted'}"
								>
									{auth.name}
								</button>
							{/each}
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={saveRole}
								class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
							>
								Simpan
							</button>
							{#if roleEditingId !== null}
								<button
									type="button"
									onclick={() => {
										roleEditingId = null;
										roleName = '';
										roleAuthorityIds = [];
									}}
									class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
								>
									Batal
								</button>
							{/if}
						</div>
					</div>
				{/if}
				{#if rolesLoading}
					<div class="text-muted py-12 text-center">Memuat peran...</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each roles as role (role.id)}
							<div class="bg-shell border-line border-rice rounded-card p-4">
								<div class="mb-2 flex items-center justify-between gap-2">
									<h4 class="text-ink font-mono font-bold">{role.name}</h4>
									{#if canRoleWrite}
										<div class="flex gap-2">
											<button
												type="button"
												onclick={() => {
													roleEditingId = role.id;
													roleName = role.name;
													roleAuthorityIds = role.authorities.map((a) => a.id);
												}}
												class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2 py-1 text-xs font-bold"
											>
												Ubah
											</button>
											<button
												type="button"
												onclick={() => deleteRole(role.id, role.name)}
												class="bg-danger text-inverted rounded-btn rice-press px-2 py-1 text-xs font-bold"
											>
												Hapus
											</button>
										</div>
									{/if}
								</div>
								<div class="flex flex-wrap gap-1">
									{#each role.authorities as auth}
										<span class="bg-subtle text-muted rounded-pill px-2 py-0.5 font-mono text-xs">
											{auth.name}
										</span>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{:else}
			{#if !canAuthRead}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="coffee" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Anda tidak memiliki izin melihat otoritas.</p>
				</div>
			{:else}
				{#if authError}
					<div class="mb-4">
						<ErrorState
							code={authError.status}
							title="Gagal Memuat Otoritas"
							message={authError.message}
							onRetry={() => loadAuthorities()}
						/>
					</div>
				{/if}
				<div class="bg-shell border-line border-rice rounded-card mb-4 p-4">
					<input
						type="text"
						placeholder="Cari authority..."
						bind:value={authKeyword}
						onkeydown={(e) => e.key === 'Enter' && loadAuthorities()}
						class="bg-subtle text-ink border-line border-rice rounded-btn w-full px-3 py-2 font-mono text-sm"
					/>
				</div>
				{#if authLoading}
					<div class="text-muted py-12 text-center">Memuat otoritas...</div>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each authorities as auth (auth.id)}
							<span class="bg-shell border-line border-rice rounded-card rice-lift flex items-center gap-2 px-3 py-1.5 font-mono text-xs text-ink">
								{auth.name}
								{#if canAuthDelete}
									<button
										type="button"
										aria-label="Hapus {auth.name}"
										onclick={() => deleteAuthority(auth.id, auth.name)}
										class="text-muted hover:text-ink font-bold"
									>
										×
									</button>
								{/if}
							</span>
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</section>
