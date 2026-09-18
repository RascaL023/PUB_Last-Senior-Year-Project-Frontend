import { API_AUTH } from '$lib/config/env';
import type { TokenStore } from '$lib/core/auth/token-store';
import type { HttpClient, RequestOptions } from '$lib/core/http/http-client';
import { AppError } from '$lib/core/http/http-errors';
import type { ApiErrorEnvelope, ApiPaged, ApiSingle, ErrorCode } from '$lib/core/types/api';
import { toQuery, type PagedResult } from '$lib/core/types/pagination';

const REFRESHABLE_CODES: (ErrorCode | null)[] = ['ACCESS_TOKEN_EXPIRED', 'INVALID_ACCESS_TOKEN'];

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

function redirectToLoginIfNeeded(): void {
	if (typeof window === 'undefined') return;
	const path = window.location.pathname;
	const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith('/guest');
	if (!isPublic) {
		window.location.href = '/login';
	}
}

interface InternalOptions extends RequestOptions {
	skipRefresh?: boolean;
}

export function createFetchHttpClient(tokenStore: TokenStore): HttpClient {
	let refreshPromise: Promise<string> | null = null;

	async function refreshAccessToken(): Promise<string> {
		if (refreshPromise) return refreshPromise;
		refreshPromise = (async () => {
			const res = await fetch(`${API_AUTH}/refresh`, {
				method: 'POST',
				credentials: 'include'
			});
			if (!res.ok) {
				tokenStore.clear();
				// Hanya sesi yang benar-benar mati (401) yang di-redirect.
				// Error 5xx / jaringan dibiarkan sebagai error biasa agar tidak logout paksa.
				if (res.status === 401) redirectToLoginIfNeeded();
				throw await toAppError(res);
			}
			const envelope = (await res.json()) as ApiSingle<{ accessToken: string }>;
			const token = envelope.data?.accessToken;
			if (!token) {
				tokenStore.clear();
				redirectToLoginIfNeeded();
				throw new AppError(res.status, 'Refresh token is missing', 'INVALID_REFRESH_TOKEN');
			}
			tokenStore.setAccessToken(token);
			return token;
		})();
		try {
			return await refreshPromise;
		} finally {
			refreshPromise = null;
		}
	}

	async function toAppError(res: Response): Promise<AppError> {
		if (res.status === 204) return new AppError(res.status, 'No content');
		try {
			const body = (await res.json()) as ApiErrorEnvelope;
			return new AppError(
				res.status,
				body.message ?? res.statusText,
				body.errorCode ?? null,
				body.errors ?? []
			);
		} catch {
			return new AppError(res.status, res.statusText || 'Request failed');
		}
	}

	async function request(
		method: string,
		path: string,
		body: unknown,
		options: InternalOptions = {}
	): Promise<Response> {
		const query = options.query ? toQuery(options.query) : '';
		const headers: Record<string, string> = {};
		if (body !== undefined) headers['Content-Type'] = 'application/json';

		const useAuth = options.auth ?? true;
		const token = useAuth ? tokenStore.getAccessToken() : null;
		if (token) headers['Authorization'] = `Bearer ${token}`;

		const res = await fetch(`${path}${query}`, {
			method,
			headers,
			credentials: 'include',
			body: body === undefined ? undefined : JSON.stringify(body)
		});

		if (res.status === 401 && useAuth && !options.skipRefresh && !path.endsWith('/refresh')) {
			let errorCode: ErrorCode | null = null;
			try {
				const clone = res.clone();
				const errBody = (await clone.json()) as ApiErrorEnvelope;
				errorCode = errBody.errorCode ?? null;
			} catch {
				errorCode = null;
			}
			if (REFRESHABLE_CODES.includes(errorCode)) {
				await refreshAccessToken();
				return request(method, path, body, {
					...options,
					skipRefresh: true,
					auth: true
				});
			}
		}
		return res;
	}

	async function ensureOk(res: Response): Promise<void> {
		if (res.ok || res.status === 204) return;
		throw await toAppError(res);
	}

	return {
		async getSingle<T>(path: string, options?: RequestOptions): Promise<T | null> {
			const res = await request('GET', path, undefined, options);
			await ensureOk(res);
			const envelope = (await res.json()) as ApiSingle<T>;
			return envelope.data ?? null;
		},
		async getPaged<T>(path: string, options?: RequestOptions): Promise<PagedResult<T>> {
			const res = await request('GET', path, undefined, options);
			await ensureOk(res);
			const envelope = (await res.json()) as ApiPaged<T>;
			return { items: envelope.data, pagination: envelope.meta.pagination };
		},
		async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null> {
			const res = await request('POST', path, body, options);
			await ensureOk(res);
			const envelope = (await res.json()) as ApiSingle<T>;
			return envelope.data ?? null;
		},
		async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null> {
			const res = await request('PUT', path, body, options);
			await ensureOk(res);
			const envelope = (await res.json()) as ApiSingle<T>;
			return envelope.data ?? null;
		},
		async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null> {
			const res = await request('PATCH', path, body, options);
			await ensureOk(res);
			const envelope = (await res.json()) as ApiSingle<T>;
			return envelope.data ?? null;
		},
		async remove(path: string, options?: RequestOptions): Promise<void> {
			const res = await request('DELETE', path, undefined, options);
			if (res.status === 204) return;
			await ensureOk(res);
		},
		async postWithoutResponse(path: string, body?: unknown, options?: RequestOptions): Promise<void> {
			const res = await request('POST', path, body, options);
			await ensureOk(res);
			if (res.status === 204) return;
			try {
				await res.json();
			} catch {
				return;
			}
		}
	};
}
