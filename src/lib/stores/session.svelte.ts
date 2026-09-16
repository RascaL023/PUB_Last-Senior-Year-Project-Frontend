import { getApi } from '$lib/infrastructure/api/index';
import { decodeAccessToken } from '$lib/core/auth/jwt';
import type { CustomerRegisterRequest, CustomerResponse } from '$lib/domain/customer';

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
		const res = await api.auth.login({ email, password });
		this.applySession(res.id, res.email, res.accessToken);
		if (!this.user) throw new Error('Token akses tidak valid');
		return this.user;
	}

	async registerCustomer(input: CustomerRegisterRequest): Promise<CustomerResponse> {
		const created = await api.customers.register(input);
		await this.login(input.email, input.password);
		return created;
	}

	async logout(): Promise<void> {
		try {
			await api.auth.logout();
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
}

export const session = new SessionStore();
