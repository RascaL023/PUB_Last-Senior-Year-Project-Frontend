import { getApi } from '$lib/infrastructure/api/index';
import { decodeAccessToken } from '$lib/core/auth/jwt';
import type { CustomerRegisterRequest, CustomerResponse } from '$lib/domain/customer';
import type { ForgotPasswordRequest, ResetPasswordRequest } from '$lib/domain/auth';
import { toastStore } from '$lib/stores/toastStore.svelte';
import { getFriendlyMessage } from '$lib/core/http/error-messages';
import { AppError } from '$lib/core/http/http-errors';
import { onSessionExpired } from '$lib/core/auth/auth-events';
import { can, canAny } from '$lib/config/nav';

const api = getApi();

/**
 * Petunjuk sesi ringan di localStorage (bukan token — token tetap httpOnly
 * cookie + memori). Fungsinya hanya supaya pengunjung anonim tidak perlu
 * memanggil `/auths/refresh` (dan menabrak 401 di console) saat membuka
 * halaman publik, dan supaya email bisa ditampilkan tanpa request tambahan.
 */
const SESSION_HINT_KEY = 'cafe-session';

interface SessionHint {
	email: string;
}

function readHint(): SessionHint | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SESSION_HINT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<SessionHint>;
		return { email: typeof parsed.email === 'string' ? parsed.email : '' };
	} catch {
		return null;
	}
}

function writeHint(email: string): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SESSION_HINT_KEY, JSON.stringify({ email } satisfies SessionHint));
	} catch {
		// localStorage bisa diblokir (private mode) — abaikan.
	}
}

function clearHint(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(SESSION_HINT_KEY);
	} catch {
		// abaikan
	}
}

export interface SessionUser {
	id: number;
	email: string;
	roles: string[];
	authorities: string[];
}

export type SessionStatus = 'unknown' | 'guest' | 'ready';

class SessionStore {
	user = $state<SessionUser | null>(null);
	status = $state<SessionStatus>('unknown');
	private restorePromise: Promise<void> | null = null;

	get isLoggedIn(): boolean {
		return this.user !== null;
	}

	/** Staf = punya minimal satu authority (role `customer_base` tidak punya). */
	get isStaff(): boolean {
		return (this.user?.authorities.length ?? 0) > 0;
	}

	hasAuthority(authority: string): boolean {
		return can(this.user?.authorities ?? [], authority);
	}

	hasAnyAuthority(authorities: readonly string[]): boolean {
		return canAny(this.user?.authorities ?? [], authorities);
	}

	hasRole(role: string): boolean {
		return this.user?.roles.includes(role) ?? false;
	}

	/** Landing per role dari authorities — dipakai setelah login & dari /my. */
	resolveLanding(): string {
		const authorities = this.user?.authorities ?? [];
		if (can(authorities, 'report.read')) return '/reports';
		if (can(authorities, 'kitchen.read')) return '/kitchen';
		if (can(authorities, 'dining.read') || can(authorities, 'order.read')) return '/floor';
		if (can(authorities, 'employee.read')) return '/employees';
		if (can(authorities, 'table.read')) return '/tables';
		if (can(authorities, 'customer.read')) return '/customers';
		return '/my';
	}

	private applySession(id: number, email: string, accessToken: string): void {
		const claims = decodeAccessToken(accessToken);
		if (!claims || !claims.sub) {
			api.tokens.clear();
			clearHint();
			this.user = null;
			this.status = 'guest';
			return;
		}
		api.tokens.setAccessToken(accessToken);
		this.user = { id, email, roles: claims.roles, authorities: claims.authorities };
		this.status = 'ready';
		writeHint(email);
	}

	async login(email: string, password: string): Promise<SessionUser> {
		try {
			const res = await api.auth.login({ email, password });
			toastStore.show('Login berhasil! Selamat datang.', 'success');
			this.applySession(res.id, res.email, res.accessToken);
			if (!this.user) throw new Error('Token akses tidak valid');
			return this.user;
		} catch (e) {
			const err = e instanceof AppError ? e : new AppError(0, getFriendlyMessage(e));
			toastStore.show(err.message, 'error');
			throw e;
		}
	}

	async registerCustomer(input: CustomerRegisterRequest): Promise<CustomerResponse> {
		try {
			const created = await api.customers.register(input);
			toastStore.show('Akun berhasil dibuat! Silakan masuk.', 'success');
			await this.login(input.email, input.password);
			return created;
		} catch (e) {
			const err = e instanceof AppError ? e : new AppError(0, getFriendlyMessage(e));
			toastStore.show(err.message, 'error');
			throw e;
		}
	}

	async logout(): Promise<void> {
		// Best-effort: tujuan logout (keluar) tercapai selama state lokal
		// dibersihkan, walau request ke server gagal (mis. cookie sudah
		// kedaluwarsa sehingga BE menjawab 401 "Token not found").
		try {
			await api.auth.logout();
		} catch {
			// abaikan — sesi lokal tetap dibersihkan di finally
		} finally {
			this.clear();
		}
		toastStore.show('Berhasil keluar.', 'success');
	}

	async logoutAll(): Promise<void> {
		try {
			await api.auth.logoutAll();
		} catch {
			// abaikan — sesi lokal tetap dibersihkan di finally
		} finally {
			this.clear();
		}
		toastStore.show('Keluar dari semua perangkat.', 'success');
	}

	/** Bersihkan sesi lokal (dipakai saat refresh token ditolak server). */
	clear(): void {
		api.tokens.clear();
		clearHint();
		this.user = null;
		this.status = 'guest';
	}

	async restore(): Promise<void> {
		if (this.status !== 'unknown') return;
		if (this.restorePromise) return this.restorePromise;
		this.restorePromise = this.doRestore();
		try {
			await this.restorePromise;
		} finally {
			this.restorePromise = null;
		}
	}

	private async doRestore(): Promise<void> {
		// Tanpa petunjuk sesi = pengunjung anonim: jangan buang request refresh.
		const hint = readHint();
		if (!hint) {
			this.status = 'guest';
			return;
		}
		try {
			const token = await api.auth.refresh();
			const claims = decodeAccessToken(token);
			if (!claims || !claims.sub) {
				this.clear();
				return;
			}
			this.applySession(Number(claims.sub), hint.email, token);
		} catch (e) {
			const status = e instanceof AppError ? e.status : 0;
			// 401 = refresh token benar-benar mati → sesi & petunjuk dibuang.
			// Selain itu (jaringan/5xx) petunjuk dipertahankan agar muat ulang
			// berikutnya masih bisa memulihkan sesi tanpa login ulang.
			if (status === 401) {
				this.clear();
			} else {
				api.tokens.clear();
				this.user = null;
				this.status = 'guest';
			}
		}
	}

	async forgotPassword(email: string): Promise<void> {
		try {
			await api.auth.forgotPassword({ email });
			toastStore.show('Link reset password telah dikirim ke email kamu.', 'success');
		} catch (e) {
			const err = e instanceof AppError ? e : new AppError(0, getFriendlyMessage(e));
			toastStore.show(err.message, 'error');
			throw e;
		}
	}

	async resetPassword(token: string, password: string): Promise<void> {
		try {
			await api.auth.resetPassword({ token, password });
			toastStore.show('Password berhasil direset!', 'success');
		} catch (e) {
			const err = e instanceof AppError ? e : new AppError(0, getFriendlyMessage(e));
			toastStore.show(err.message, 'error');
			throw e;
		}
	}
}

export const session = new SessionStore();

// Saat refresh token ditolak server (sesi benar-benar berakhir), bersihkan
// state sesi lokal tanpa toast supaya header & guard langsung menyesuaikan.
onSessionExpired(() => session.clear());
