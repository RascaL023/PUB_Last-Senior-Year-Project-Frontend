<script lang="ts">
	import { session } from '$lib/stores';
	import { getApi } from '$lib/infrastructure/api/index';
	import { toAppError } from '$lib/core/http/error-messages';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { formatWibDate } from '$lib/core/time/wib';
	import type { MyDiningResponse } from '$lib/domain/dining';
	import type { OrderResponse } from '$lib/domain/order';
	import type { CustomerResponse } from '$lib/domain/customer';
	import type { EmployeeResponse } from '$lib/domain/employee';
	import type { PagedResult } from '$lib/core/types/pagination';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import { goto } from '$app/navigation';

	const api = getApi();

	let dinings = $state<MyDiningResponse[]>([]);
	let orders = $state<OrderResponse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let ordersLoading = $state(false);
	let ordersError = $state<string | null>(null);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalItems = $state(0);

	let profile = $state<CustomerResponse | null>(null);
	let profileError = $state<string | null>(null);
	let editingProfile = $state(false);
	let profileName = $state('');
	let profilePhone = $state('');
	let savingProfile = $state(false);

	let employee = $state<EmployeeResponse | null>(null);
	let employeeError = $state<string | null>(null);
	let editingEmployee = $state(false);
	let employeeName = $state('');
	let employeePhone = $state('');
	let savingEmployee = $state(false);

	// CUSTOMER_BASE tidak punya authority; staf selalu punya minimal satu.
	// Surface member (/my/**) mewajibkan profil customer → staf selalu 403,
	// jadi untuk staf jangan panggil API sama sekali.
	const isStaff = $derived((session.user?.authorities.length ?? 0) > 0);
	const staffRoleLabel = $derived(
		employee?.roleName ?? (session.user?.roles ?? []).join(', ') ?? ''
	);
	const staffRoleText = $derived(staffRoleLabel.trim() === '' ? 'Staf' : staffRoleLabel);

	$effect(() => {
		if (session.status === 'ready' && session.isLoggedIn && !isStaff) {
			void loadProfile();
			void loadMyDinings();
			void loadMyOrders();
		}
		if (session.status === 'ready' && session.isLoggedIn && isStaff) {
			void loadEmployee();
		}
	});

	async function loadEmployee() {
		try {
			employeeError = null;
			employee = await api.employees.getMe();
		} catch (e) {
			employeeError = toAppError(e).message;
		}
	}

	async function saveEmployee() {
		if (!employee || employeeName.trim().length < 3 || savingEmployee) return;
		savingEmployee = true;
		try {
			employee = await api.employees.updateMe({
				name: employeeName.trim(),
				phone: employeePhone.trim() || undefined
			});
			editingEmployee = false;
			toastStore.show('Profil karyawan diperbarui.', 'success');
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			savingEmployee = false;
		}
	}

	async function loadProfile() {
		try {
			profileError = null;
			profile = await api.customers.getMe();
		} catch (e) {
			const appErr = toAppError(e);
			profileError = appErr.status === 403 ? null : appErr.message;
			if (appErr.status === 403) {
				error = 'Halaman ini khusus member. Akun ini belum punya profil member.';
			}
		}
	}

	async function saveProfile() {
		if (!profile || profileName.trim().length < 2 || savingProfile) return;
		savingProfile = true;
		try {
			profile = await api.customers.updateMe({
				name: profileName.trim(),
				email: profile.email,
				phone: profilePhone.trim() || undefined,
				notes: profile.notes ?? undefined
			});
			editingProfile = false;
			toastStore.show('Profil diperbarui.', 'success');
		} catch (e) {
			toastStore.show(toAppError(e).message, 'error');
		} finally {
			savingProfile = false;
		}
	}

	async function loadMyDinings() {
		try {
			dinings = (await api.dinings.myDinings()) ?? [];
		} catch (e) {
			const appErr = toAppError(e);
			if (appErr.status === 403) {
				error = 'Halaman ini khusus member. Akun ini belum punya profil member.';
			} else {
				error = appErr.message;
			}
		}
	}

	async function loadMyOrders(page = 0) {
		ordersLoading = true;
		ordersError = null;
		try {
			const result: PagedResult<OrderResponse> = await api.orders.myOrders({ page, size: 10, sort: 'createdAt,desc' });
			orders = result.items;
			currentPage = result.pagination.currentPage;
			totalPages = result.pagination.totalPages;
			totalItems = result.pagination.totalItems;
		} catch (e) {
			ordersError = toAppError(e).message;
		} finally {
			ordersLoading = false;
		}
	}

	function formatPrice(price: number): string {
		return price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
	}

	function formatDate(date: string): string {
		return formatWibDate(date);
	}

	function invoiceLabel(status: string | null): string {
		if (!status) return 'Belum ada tagihan';
		const labels: Record<string, string> = {
			OPEN: 'Terbuka',
			PARTIALLY_PAID: 'Sebagian',
			PAID: 'Lunas',
			VOID: 'Void'
		};
		return labels[status] ?? status;
	}

	function invoiceColor(status: string | null): string {
		switch (status) {
			case 'OPEN':
				return 'bg-honey text-ink';
			case 'PARTIALLY_PAID':
				return 'bg-sky text-inverted';
			case 'PAID':
				return 'bg-leaf text-inverted';
			case 'VOID':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-muted';
		}
	}

	function statusLabel(status: string): string {
		const labels: Record<string, string> = {
			CREATED: 'Menunggu',
			CONFIRMED: 'Dikonfirmasi',
			PREPARING: 'Disiapkan',
			READY: 'Siap',
			COMPLETED: 'Selesai',
			CANCELLED: 'Dibatalkan'
		};
		return labels[status] ?? status;
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'CREATED':
				return 'bg-honey text-ink';
			case 'CONFIRMED':
			case 'PREPARING':
				return 'bg-sky text-inverted';
			case 'READY':
				return 'bg-ember text-inverted';
			case 'COMPLETED':
				return 'bg-leaf text-inverted';
			case 'CANCELLED':
				return 'bg-danger text-inverted';
			default:
				return 'bg-subtle text-ink';
		}
	}
</script>

<svelte:head>
	<title>Akun Saya — Hysteria Cafe</title>
</svelte:head>

<div class="p-6 bg-app min-h-screen">
	<h2 class="font-display text-ink text-2xl font-extrabold mb-6">Akun Saya</h2>

	{#if isStaff}
		<div class="bg-shell border-line border-rice rounded-card p-6">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex items-center gap-3">
					<Icon name="user" class="text-muted h-8 w-8" />
					<div>
						<p class="text-ink font-mono font-bold">{employee?.name ?? session.user?.email ?? '-'}</p>
						<p class="text-muted font-mono text-xs">
							{staffRoleText}{employee ? ` · ${employee.status}` : ''}
						</p>
					</div>
				</div>
				{#if employee && !editingEmployee}
					<button
						type="button"
						onclick={() => {
							employeeName = employee?.name ?? '';
							employeePhone = employee?.phone ?? '';
							editingEmployee = true;
						}}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
					>
						Ubah
					</button>
				{/if}
			</div>
			{#if employeeError}
				<p class="text-muted mt-2 text-sm">{employeeError}</p>
			{:else if employee && editingEmployee}
				<div class="mt-3 flex flex-col gap-2">
					<label class="flex flex-col gap-1 text-xs font-bold text-ink">
						Nama (3–100 karakter)
						<input
							type="text"
							bind:value={employeeName}
							minlength="3"
							maxlength="100"
							class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs font-bold text-ink">
						Telepon (10–13 digit)
						<input
							type="tel"
							bind:value={employeePhone}
							placeholder="cth. 081234567890"
							class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
						/>
					</label>
					<div class="flex gap-2">
						<button
							type="button"
							disabled={employeeName.trim().length < 3 || savingEmployee}
							onclick={saveEmployee}
							class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
						>
							{savingEmployee ? 'Menyimpan...' : 'Simpan'}
						</button>
						<button
							type="button"
							onclick={() => (editingEmployee = false)}
							class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
						>
							Batal
						</button>
					</div>
				</div>
			{:else if employee}
				<dl class="mt-2 space-y-1 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted font-bold">Email</dt>
						<dd class="text-ink font-mono text-xs">{employee.email}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted font-bold">Telepon</dt>
						<dd class="text-ink font-mono">{employee.phone ?? '-'}</dd>
					</div>
				</dl>
			{/if}
			<p class="text-muted mt-4 text-sm">
				Sesi dan riwayat di halaman ini khusus member — gunakan halaman kerjamu.
			</p>
			<button
				type="button"
				onclick={() => goto(session.resolveLanding())}
				class="bg-accent text-inverted rounded-btn border-rice border-line rice-press mt-2 px-4 py-2 text-sm font-bold"
			>
				Ke Halaman Kerja
			</button>
		</div>
	{/if}
	{#if !isStaff}
	{#if error}
		<div class="mb-4">
			<ErrorState code={403} title="Profil Member" message={error} />
		</div>
	{/if}

	<div class="bg-shell border-line border-rice rounded-card mb-8 p-4">
		<div class="flex items-center justify-between gap-2">
			<h3 class="font-display text-ink text-lg font-bold">Profil Member</h3>
			{#if profile && !editingProfile}
				<button
					type="button"
					onclick={() => {
						profileName = profile?.name ?? '';
						profilePhone = profile?.phone ?? '';
						editingProfile = true;
					}}
					class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-3 py-1.5 text-xs font-bold"
				>
					Ubah
				</button>
			{/if}
		</div>
		{#if profileError}
			<p class="text-muted mt-2 text-sm">{profileError}</p>
		{:else if !profile}
			<p class="text-muted mt-2 text-sm">Memuat profil...</p>
		{:else if editingProfile}
			<div class="mt-3 flex flex-col gap-2">
				<label class="flex flex-col gap-1 text-xs font-bold text-ink">
					Nama
					<input
						type="text"
						bind:value={profileName}
						minlength="2"
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
					/>
				</label>
				<label class="flex flex-col gap-1 text-xs font-bold text-ink">
					Telepon
					<input
						type="tel"
						bind:value={profilePhone}
						placeholder="cth. 081234567890"
						class="bg-subtle text-ink border-line border-rice rounded-btn px-3 py-2 text-sm outline-none placeholder:text-faint"
					/>
				</label>
				<div class="flex gap-2">
					<button
						type="button"
						disabled={profileName.trim().length < 2 || savingProfile}
						onclick={saveProfile}
						class="bg-accent text-inverted rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold disabled:opacity-50"
					>
						{savingProfile ? 'Menyimpan...' : 'Simpan'}
					</button>
					<button
						type="button"
						onclick={() => (editingProfile = false)}
						class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press px-4 py-2 text-xs font-bold"
					>
						Batal
					</button>
				</div>
			</div>
		{:else}
			<dl class="mt-2 space-y-1 text-sm">
				<div class="flex justify-between gap-2">
					<dt class="text-muted font-bold">Nama</dt>
					<dd class="text-ink font-mono font-bold">{profile.name}</dd>
				</div>
				<div class="flex justify-between gap-2">
					<dt class="text-muted font-bold">Email</dt>
					<dd class="text-ink font-mono text-xs">{profile.email}</dd>
				</div>
				<div class="flex justify-between gap-2">
					<dt class="text-muted font-bold">Telepon</dt>
					<dd class="text-ink font-mono">{profile.phone ?? '-'}</dd>
				</div>
			</dl>
		{/if}
	</div>

	<div class="mb-8">
		<h3 class="font-display text-ink text-lg font-bold mb-3">Sesi Aktif</h3>
		{#if dinings.length === 0}
			<div class="bg-shell border-line border-rice rounded-card p-6 text-center">
				<Icon name="user" class="h-8 w-8 text-muted mx-auto mb-2" />
				<p class="text-muted text-sm font-bold">Belum ada sesi aktif.</p>
				<p class="text-faint text-xs mt-1">Pindai QR di meja untuk memulai.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each dinings as dining (dining.diningId)}
					<div class="bg-shell border-line border-rice rounded-card p-3 rice-lift">
						<div class="flex justify-between items-center gap-2">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-mono text-ink font-bold">Meja {dining.tableNumber}</span>
								<span class="rounded-pill bg-leaf text-inverted px-2 py-0.5 text-xs font-mono font-bold">
									{dining.status}
								</span>
								<span class="rounded-pill px-2 py-0.5 text-xs font-mono font-bold {invoiceColor(dining.invoiceStatus)}">
									{invoiceLabel(dining.invoiceStatus)}
								</span>
							</div>
							<button
								type="button"
								onclick={() => goto(`/my/dinings/${dining.guestToken}`)}
								class="text-accent font-bold text-sm rice-press flex-none"
							>
								Lanjut pesan
							</button>
						</div>
						{#if dining.orders && dining.orders.length > 0}
							<div class="border-linemuted mt-2 space-y-1 border-t pt-2 text-sm">
								{#each dining.orders as order}
									<div class="flex items-center justify-between gap-2">
										<span class="text-ink font-mono text-xs font-bold">{order.orderNumber}</span>
										<span class="text-muted font-mono text-xs">
											{statusLabel(order.status)} ·
											{order.items?.map((i) => `${i.itemName} ×${i.quantity}`).join(', ') || `${formatPrice(order.totalPrice)}`}
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div>
		<h3 class="font-display text-ink text-lg font-bold mb-3">Riwayat Pesanan</h3>
		{#if ordersError}
			<div class="mb-4">
				<ErrorState
					title="Gagal Memuat Riwayat"
					message={ordersError}
					onRetry={() => loadMyOrders(currentPage - 1)}
				/>
			</div>
		{:else if ordersLoading}
			<p class="text-muted text-sm">Memuat riwayat...</p>
		{:else if orders.length === 0}
			<p class="text-muted text-sm">Belum ada riwayat pesanan.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-line border-b border-rice">
							<th class="text-left py-2 text-muted font-mono font-bold">No. Order</th>
							<th class="text-left py-2 text-muted font-mono font-bold">Status</th>
							<th class="text-right py-2 text-muted font-mono font-bold">Total</th>
							<th class="text-right py-2 text-muted font-mono font-bold">Waktu</th>
						</tr>
					</thead>
					<tbody>
						{#each orders as order (order.id)}
							<tr class="border-line border-b border-rice">
								<td class="py-2 text-ink font-mono">{order.orderNumber}</td>
								<td class="py-2">
									<span class="rounded-pill px-2 py-0.5 font-mono text-xs font-bold {statusColor(order.status)}">
										{statusLabel(order.status)}
									</span>
								</td>
								<td class="py-2 text-ink text-right font-mono">{formatPrice(order.totalPrice)}</td>
								<td class="py-2 text-muted text-right font-mono text-xs">{formatDate(order.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<div class="flex justify-between items-center mt-4 text-sm">
					<button
						type="button"
						onclick={() => loadMyOrders(currentPage - 2)}
						disabled={currentPage <= 1}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Sebelumnya
					</button>
					<span class="text-muted font-mono">Halaman {currentPage} dari {totalPages}</span>
					<button
						type="button"
						onclick={() => loadMyOrders(currentPage)}
						disabled={currentPage >= totalPages || !orders.length}
						class="bg-subtle text-ink rounded-btn rice-press px-3 py-1.5 text-xs font-bold disabled:opacity-50"
					>
						Berikutnya
					</button>
				</div>
			{/if}
		{/if}
	</div>
	{/if}
</div>
