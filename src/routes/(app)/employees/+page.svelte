<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { formatWibDate } from '$lib/core/time/wib';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import type { AppError } from '$lib/core/http/http-errors';
	import type {
		EmployeeListQuery,
		EmployeeRequest,
		EmployeeResponse,
		EmployeeStatus
	} from '$lib/domain/employee';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	const api = getApi();

	const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
		{ value: 'ACTIVE', label: 'Aktif' },
		{ value: 'INACTIVE', label: 'Nonaktif' },
		{ value: 'SUSPENDED', label: 'Ditangguhkan' }
	];

	const PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{10,13}$/;
	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let employees = $state<EmployeeResponse[]>([]);
	let loading = $state(false);
	let error: AppError | null = $state(null);

	let keyword = $state('');
	let statusFilter = $state<EmployeeStatus | ''>('');
	let showDeleted = $state(false);
	let page = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let roleOptions = $state<string[]>([]);

	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let submitting = $state(false);
	let formName = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formRole = $state('');
	let formPhone = $state('');
	let formStatus = $state<EmployeeStatus>('ACTIVE');

	const canRead = $derived(
		session.hasAuthority('employee.read') || session.hasAuthority('employee.*')
	);
	const canCreate = $derived(
		session.hasAuthority('employee.create') || session.hasAuthority('employee.*')
	);
	const canUpdate = $derived(
		session.hasAuthority('employee.update') || session.hasAuthority('employee.*')
	);
	const canDelete = $derived(
		session.hasAuthority('employee.delete') || session.hasAuthority('employee.*')
	);
	const canSeeRoles = $derived(
		session.hasAuthority('role.read') || session.hasAuthority('role.*')
	);

	const formTitle = $derived(editingId === null ? 'Karyawan Baru' : 'Ubah Karyawan');
	const formValid = $derived(
		formName.trim().length >= 3 &&
			formName.trim().length <= 100 &&
			formRole.trim().length > 0 &&
			(editingId !== null ||
				(EMAIL_PATTERN.test(formEmail.trim()) && formPassword.length >= 8)) &&
			(formPhone.trim() === '' || PHONE_PATTERN.test(formPhone.trim()))
	);

	function statusLabel(status: EmployeeStatus): string {
		return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
	}

	function statusColor(employee: EmployeeResponse): string {
		if (employee.deletedAt) return 'bg-subtle text-muted';
		switch (employee.status) {
			case 'ACTIVE':
				return 'bg-leaf text-inverted';
			case 'SUSPENDED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-honey text-ink';
		}
	}

	async function loadEmployees(target = 0) {
		if (!canRead) return;
		loading = true;
		error = null;
		try {
			const query: EmployeeListQuery = {
				page: target,
				size: 10,
				sort: 'name,asc',
				keyword: keyword.trim() || undefined,
				status: statusFilter || undefined,
				includeDeleted: showDeleted || undefined
			};
			const result = await api.employees.list(query);
			employees = result.items;
			page = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			error = toAppError(e);
		} finally {
			loading = false;
		}
	}

	async function loadRoles() {
		if (!canSeeRoles) return;
		try {
			const result = await api.roles.list({ size: 100, sort: 'name,asc' });
			roleOptions = result.items.map((role) => role.name);
		} catch {
			roleOptions = [];
		}
	}

	function openCreate() {
		editingId = null;
		formName = '';
		formEmail = '';
		formPassword = '';
		formRole = roleOptions[0] ?? '';
		formPhone = '';
		formStatus = 'ACTIVE';
		showForm = true;
	}

	function openEdit(employee: EmployeeResponse) {
		editingId = employee.id;
		formName = employee.name;
		formEmail = employee.email;
		formPassword = '';
		formRole = employee.roleName ?? roleOptions[0] ?? '';
		formPhone = employee.phone ?? '';
		formStatus = employee.status;
		showForm = true;
	}

	async function submitForm() {
		if (!formValid || submitting) return;
		submitting = true;
		try {
			const phone = formPhone.trim() || undefined;
			if (editingId === null) {
				const payload: EmployeeRequest = {
					name: formName.trim(),
					email: formEmail.trim(),
					password: formPassword,
					roleName: formRole.trim().toUpperCase(),
					phone,
					status: formStatus
				};
				await api.employees.create(payload);
				toastStore.show('Karyawan dibuat.', 'success');
			} else {
				await api.employees.patch(editingId, {
					name: formName.trim(),
					phone,
					status: formStatus,
					roleName: formRole.trim().toUpperCase()
				});
				toastStore.show('Data karyawan diperbarui.', 'success');
			}
			showForm = false;
			await loadEmployees(editingId === null ? 0 : page - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			submitting = false;
		}
	}

	async function runAction(
		employee: EmployeeResponse,
		action: 'activate' | 'suspend' | 'restore' | 'delete'
	) {
		const labels = {
			activate: 'Aktifkan',
			suspend: 'Tangguhkan',
			restore: 'Pulihkan',
			delete: 'Hapus'
		} as const;
		if (!confirm(`${labels[action]} karyawan "${employee.name}"?`)) return;
		try {
			if (action === 'activate') await api.employees.activate(employee.id);
			else if (action === 'suspend') await api.employees.suspend(employee.id);
			else if (action === 'restore') await api.employees.restore(employee.id);
			else await api.employees.remove(employee.id);
			toastStore.show(`${labels[action]} berhasil.`, 'success');
			await loadEmployees(page - 1);
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		}
	}

	function search() {
		void loadEmployees(0);
	}

	function changePage(delta: number) {
		const target = page + delta;
		if (target < 1 || target > totalPages) return;
		void loadEmployees(target - 1);
	}

	$effect(() => {
		if (canRead) void loadEmployees(0);
	});

	$effect(() => {
		if (canRead) void loadRoles();
	});
</script>

<svelte:head>
	<title>Karyawan — Hysteria Cafe</title>
</svelte:head>

<section class="bg-app text-ink min-h-screen px-3 py-6 sm:px-6">
	<div class="mx-auto max-w-7xl">
		{#if !canRead}
			<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
				<Icon name="users" class="text-muted mx-auto mb-2 h-8 w-8" />
				<h2 class="font-display text-ink mb-2 text-xl font-extrabold">Akses Dibatasi</h2>
				<p class="text-muted text-sm font-bold">Anda tidak memiliki izin mengelola data karyawan.</p>
			</div>
		{:else}
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="font-display text-ink text-2xl font-extrabold tracking-tight">Karyawan</h2>
					<p class="text-muted mt-1 text-xs font-bold">
						{totalItems} karyawan{showDeleted ? ' (termasuk arsip)' : ''}
					</p>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => loadEmployees(page - 1)}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
					>
						<Icon name="refresh" class="h-3.5 w-3.5" /> Muat ulang
					</button>
					{#if canCreate}
						<button
							type="button"
							onclick={openCreate}
							class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold"
						>
							+ Karyawan
						</button>
					{/if}
				</div>
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState
						code={error.status}
						title="Gagal Memuat Karyawan"
						message={error.message}
						onRetry={() => loadEmployees(page - 1)}
					/>
				</div>
			{/if}

			<div class="bg-shell border-line border-rice rounded-card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
				<input
					type="text"
					placeholder="Cari nama atau email..."
					bind:value={keyword}
					onkeydown={(e) => e.key === 'Enter' && search()}
					class="bg-subtle text-ink border-line border-rice rounded-btn w-full flex-1 px-3 py-2 text-sm font-bold"
				/>
				<select
					bind:value={statusFilter}
					onchange={search}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					<option value="">Semua Status</option>
					{#each STATUS_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<label class="text-muted flex items-center gap-2 text-xs font-bold">
					<input
						type="checkbox"
						bind:checked={showDeleted}
						onchange={search}
						class="border-line rounded"
					/>
					Tampilkan arsip
				</label>
			</div>

			{#if loading}
				<div class="text-muted py-12 text-center">Memuat karyawan...</div>
			{:else if employees.length === 0}
				<div class="bg-shell border-line border-rice rounded-card p-8 text-center">
					<Icon name="users" class="text-muted mx-auto mb-2 h-8 w-8" />
					<p class="text-muted text-sm font-bold">Belum ada karyawan yang cocok.</p>
				</div>
			{:else}
				<div class="bg-shell border-line border-rice rounded-card overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-line border-rice border-b">
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Nama</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Kontak</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Peran</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Status</th>
								<th class="text-muted px-4 py-3 text-left font-mono font-bold">Bergabung</th>
								<th class="text-muted px-4 py-3 text-right font-mono font-bold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each employees as employee (employee.id)}
								<tr class="border-line border-rice border-b last:border-b-0">
									<td class="px-4 py-3">
										<span class="text-ink block font-bold">{employee.name}</span>
										{#if employee.deletedAt}
											<span class="text-faint font-mono text-xs">
												diarsipkan {formatWibDate(employee.deletedAt)}
											</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										<span class="text-ink block font-mono text-xs">{employee.email}</span>
										<span class="text-muted font-mono text-xs">{employee.phone ?? '-'}</span>
									</td>
									<td class="px-4 py-3">
										<span class="bg-subtle text-muted rounded-pill border-rice border-line px-2 py-0.5 font-mono text-xs font-bold">
											{employee.roleName ?? '-'}
										</span>
									</td>
									<td class="px-4 py-3">
										<span class="rounded-pill border-rice border-line px-2 py-0.5 font-mono text-xs font-bold {statusColor(employee)}">
											{employee.deletedAt ? 'Arsip' : statusLabel(employee.status)}
										</span>
									</td>
									<td class="text-muted px-4 py-3 font-mono text-xs">
										{formatWibDate(employee.createdAt)}
									</td>
									<td class="px-4 py-3">
										<div class="flex flex-wrap justify-end gap-1.5">
											{#if canUpdate}
												<button
													type="button"
													onclick={() => openEdit(employee)}
													class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-2.5 py-1 text-xs font-bold"
												>
													Ubah
												</button>
											{/if}
											{#if canUpdate && !employee.deletedAt && employee.status !== 'ACTIVE'}
												<button
													type="button"
													onclick={() => runAction(employee, 'activate')}
													class="bg-leaf text-inverted rounded-btn rice-press px-2.5 py-1 text-xs font-bold"
												>
													Aktifkan
												</button>
											{/if}
											{#if canUpdate && !employee.deletedAt && employee.status === 'ACTIVE'}
												<button
													type="button"
													onclick={() => runAction(employee, 'suspend')}
													class="bg-ember text-inverted rounded-btn rice-press px-2.5 py-1 text-xs font-bold"
												>
													Tangguhkan
												</button>
											{/if}
											{#if canUpdate && employee.deletedAt}
												<button
													type="button"
													onclick={() => runAction(employee, 'restore')}
													class="bg-sky text-inverted rounded-btn rice-press px-2.5 py-1 text-xs font-bold"
												>
													Pulihkan
												</button>
											{/if}
											{#if canDelete && !employee.deletedAt}
												<button
													type="button"
													onclick={() => runAction(employee, 'delete')}
													class="bg-danger text-inverted rounded-btn rice-press px-2.5 py-1 text-xs font-bold"
												>
													Hapus
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if totalPages > 1}
					<div class="mt-4 flex items-center justify-between text-sm">
						<button
							type="button"
							onclick={() => changePage(-1)}
							disabled={page <= 1}
							class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
						>
							Sebelumnya
						</button>
						<span class="text-muted font-mono text-xs">Halaman {page} dari {totalPages}</span>
						<button
							type="button"
							onclick={() => changePage(1)}
							disabled={page >= totalPages}
							class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
						>
							Berikutnya
						</button>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</section>

{#if canRead}
	<Modal
		open={showForm}
		title={formTitle}
		subtitle={editingId === null
			? 'Akun login karyawan dibuat otomatis dari email & password.'
			: 'Peran yang diubah akan membuat karyawan login ulang.'}
		onClose={() => (showForm = false)}
	>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-xs font-bold text-ink">
				Nama (3–100 karakter)
				<input
					type="text"
					bind:value={formName}
					maxlength="100"
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs font-bold text-ink">
				Telepon (10–13 digit, opsional)
				<input
					type="tel"
					bind:value={formPhone}
					placeholder="cth. 081234567890"
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
				/>
			</label>
			{#if editingId === null}
				<label class="flex flex-col gap-1 text-xs font-bold text-ink">
					Email
					<input
						type="email"
						bind:value={formEmail}
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
					/>
				</label>
				<label class="flex flex-col gap-1 text-xs font-bold text-ink">
					Password (min 8 karakter)
					<input
						type="password"
						bind:value={formPassword}
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm"
					/>
				</label>
			{/if}
			<label class="flex flex-col gap-1 text-xs font-bold text-ink">
				Peran
				{#if roleOptions.length > 0}
					<select
						bind:value={formRole}
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
					>
						<option value="">Pilih peran...</option>
						{#each roleOptions as role (role)}
							<option value={role}>{role}</option>
						{/each}
					</select>
				{:else}
					<input
						type="text"
						bind:value={formRole}
						placeholder="cth. WAITER"
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-mono"
					/>
				{/if}
			</label>
			<label class="flex flex-col gap-1 text-xs font-bold text-ink">
				Status
				<select
					bind:value={formStatus}
					class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
				>
					{#each STATUS_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="border-linemuted mt-4 flex items-center justify-end gap-2 border-t pt-4">
			<button
				type="button"
				onclick={() => (showForm = false)}
				class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-sm font-bold"
			>
				Batal
			</button>
			<button
				type="button"
				disabled={!formValid || submitting}
				onclick={submitForm}
				class="bg-accent text-inverted border-line border-rice rounded-btn rice-press px-4 py-2 text-sm font-bold disabled:opacity-50"
			>
				{submitting ? 'Menyimpan...' : 'Simpan'}
			</button>
		</div>
	</Modal>
{/if}
