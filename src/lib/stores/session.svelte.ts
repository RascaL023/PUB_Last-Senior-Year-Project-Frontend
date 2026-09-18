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

	get isLoggedIn(): boolean {
		return this.user !== null;
	}

	hasAuthority(authority: string): boolean {
		return this.user?.authorities.includes(authority) ?? false;
	}

	hasRole(role: string): boolean {
		return this.user?.roles.includes(role) ?? false;
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
		try {
			await api.auth.logout();
			toastStore.show('Berhasil keluar.', 'success');
		} catch (e) {
			toastStore.show('Gagal keluar. Coba lagi.', 'error');
		} finally {
			this.user = null;
			this.status = 'guest';
		}
	}

	async restore(): Promise<void> {
		if (this.status !== 'unknown') return;
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
