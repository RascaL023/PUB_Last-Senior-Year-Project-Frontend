import { getApi } from '$lib/infrastructure/api/index';
import { decodeAccessToken } from '$lib/core/auth/jwt';
import type { CustomerRegisterRequest, CustomerResponse } from '$lib/domain/customer';
import type { ForgotPasswordRequest, ResetPasswordRequest } from '$lib/domain/auth';
import { toastStore } from '$lib/stores/toastStore.svelte';
import { getFriendlyMessage } from '$lib/core/http/error-messages';
import { AppError } from '$lib/core/http/http-errors';

const api = getApi();

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

	hasAuthority(authority: string): boolean {
		return this.user?.authorities.includes(authority) ?? false;
	}

	hasRole(role: string): boolean {
		return this.user?.roles.includes(role) ?? false;
	}

	/** Landing per role dari authorities (FE_INTEGRATION §2). */
	resolveLanding(): string {
		const authorities = this.user?.authorities ?? [];
		if (authorities.includes('report.read')) return '/reports';
		if (authorities.includes('kitchen.read') || authorities.includes('kitchen.*')) return '/kitchen';
		if (
			authorities.includes('dining.read') ||
			authorities.includes('dining.*') ||
			authorities.includes('order.read') ||
			authorities.includes('order.*')
		)
			return '/floor';
		return '/my';
	}

	private applySession(id: number, email: string, accessToken: string): void {
		const claims = decodeAccessToken(accessToken);
		if (!claims || !claims.sub) {
			api.tokens.clear();
			this.user = null;
			this.status = 'guest';
			return;
		}
		api.tokens.setAccessToken(accessToken);
		this.user = { id, email, roles: claims.roles, authorities: claims.authorities };
		this.status = 'ready';
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
			this.user = null;
			this.status = 'guest';
		}
		toastStore.show('Berhasil keluar.', 'success');
	}

	async logoutAll(): Promise<void> {
		try {
			await api.auth.logoutAll();
		} catch {
			// abaikan — sesi lokal tetap dibersihkan di finally
		} finally {
			this.user = null;
			this.status = 'guest';
		}
		toastStore.show('Keluar dari semua perangkat.', 'success');
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
		try {
			const token = await api.auth.refresh();
			const claims = decodeAccessToken(token);
			if (!claims || !claims.sub) {
				this.user = null;
				this.status = 'guest';
				return;
			}
			let email = '';
			try {
				const profile = await api.users.getById(Number(claims.sub));
				email = profile.email;
			} catch {
				email = '';
			}
			this.applySession(Number(claims.sub), email, token);
		} catch {
			this.user = null;
			this.status = 'guest';
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
