import { API_AUTH } from '$lib/config/env';
import type { TokenStore } from '$lib/core/auth/token-store';
import { decodeAccessToken, isExpired } from '$lib/core/auth/jwt';
import { emitSessionExpired } from '$lib/core/auth/auth-events';
import type { HttpClient, RequestOptions } from '$lib/core/http/http-client';
import { AppError } from '$lib/core/http/http-errors';
import type { ApiErrorEnvelope, ApiPaged, ApiSingle } from '$lib/core/types/api';
import { toQuery, type PagedResult } from '$lib/core/types/pagination';

const REFRESH_PATH = `${API_AUTH}/refresh`;

/** Halaman publik: jangan pernah dipaksa redirect ke /login dari sini. */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Setelah satu percobaan refresh gagal, tahan percobaan berikutnya selama
 * beberapa detik. Tanpa ini, sekumpulan request yang 401 bersamaan bisa
 * memicu rentetan request refresh (dan pada provider dengan rotasi token,
 * request kedua akan menabrak token yang sudah dirotasi).
 */
const REFRESH_COOLDOWN_MS = 5_000;

function isPublicPath(path: string): boolean {
	return PUBLIC_PATHS.includes(path) || path.startsWith('/guest');
}

function redirectToLoginIfNeeded(): void {
	if (typeof window === 'undefined') return;
	const path = window.location.pathname;
	if (isPublicPath(path)) return;
	const next = encodeURIComponent(`${path}${window.location.search}`);
	window.location.href = `/login?redirectTo=${next}`;
}

interface InternalOptions extends RequestOptions {
	skipRefresh?: boolean;
}

export function createFetchHttpClient(tokenStore: TokenStore): HttpClient {
	/** Satu-satunya request refresh yang boleh berjalan pada satu waktu. */
	let inFlightRefresh: Promise<string> | null = null;
	let refreshCooldownUntil = 0;

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

	async function performRefresh(): Promise<string> {
		let res: Response;
		try {
			res = await fetch(REFRESH_PATH, { method: 'POST', credentials: 'include' });
		} catch {
			throw new AppError(0, 'Tidak dapat menghubungi server. Periksa koneksimu.');
		}

		if (!res.ok) {
			const error = await toAppError(res);
			// Bersihkan sisa token & tandai sesi berakhir. Hanya 401 yang
			// berarti refresh token benar-benar mati (5xx/jaringan dibiarkan
			// sebagai error biasa supaya tidak logout paksa).
			tokenStore.clear();
			refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
			if (res.status === 401) {
				emitSessionExpired();
				redirectToLoginIfNeeded();
			}
			throw error;
		}

		const envelope = (await res.json()) as ApiSingle<{ accessToken: string }>;
		const token = envelope.data?.accessToken;
		if (!token) {
			tokenStore.clear();
			refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
			emitSessionExpired();
			redirectToLoginIfNeeded();
			throw new AppError(res.status, 'Access token tidak diterima dari server', 'INVALID_REFRESH_TOKEN');
		}

		refreshCooldownUntil = 0;
		tokenStore.setAccessToken(token);
		return token;
	}

	/**
	 * Single-flight: semua pemanggil — retry 401, restore sesi, maupun alur
	 * lain — berbagi satu request refresh yang sama.
	 */
	function refreshAccessToken(): Promise<string> {
		if (!inFlightRefresh) {
			inFlightRefresh = performRefresh().finally(() => {
				inFlightRefresh = null;
			});
		}
		return inFlightRefresh;
	}

	function isCoolingDown(): boolean {
		return Date.now() < refreshCooldownUntil;
	}

	function accessTokenExpired(): boolean {
		const token = tokenStore.getAccessToken();
		if (!token) return false;
		const claims = decodeAccessToken(token);
		return claims !== null && isExpired(claims);
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
		const isRefreshCall = path.endsWith('/refresh');
		const canRefresh = useAuth && !isRefreshCall && !options.skipRefresh;

		// Proaktif: access token di memori sudah kedaluwarsa → segarkan dulu
		// agar request tidak perlu menabrak 401 lebih dulu.
		if (canRefresh && !isCoolingDown() && accessTokenExpired()) {
			try {
				await refreshAccessToken();
			} catch {
				// Biarkan request tetap berjalan; 401 di bawah akan menangani.
			}
		}

		const token = useAuth ? tokenStore.getAccessToken() : null;
		if (token) headers['Authorization'] = `Bearer ${token}`;

		const res = await fetch(`${path}${query}`, {
			method,
			headers,
			credentials: 'include',
			body: body === undefined ? undefined : JSON.stringify(body)
		});

		// Access token kedaluwarsa (atau belum ada) → minta token baru SEKALI,
		// lalu ulangi request yang sama dengan token baru.
		if (res.status === 401 && canRefresh && !isCoolingDown()) {
			try {
				await refreshAccessToken();
			} catch {
				// Refresh gagal — sesi sudah dibersihkan; teruskan respons 401
				// asli supaya halaman bisa menampilkan error yang sesuai.
				return res;
			}
			return request(method, path, body, { ...options, skipRefresh: true, auth: true });
		}

		return res;
	}

	async function ensureOk(res: Response): Promise<void> {
		if (res.ok || res.status === 204) return;
		throw await toAppError(res);
	}

	return {
		refreshAccessToken,
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
			const items = envelope.data ?? [];
			const pagination = envelope.meta?.pagination ?? {
				currentPage: 1,
				perPage: items.length,
				totalItems: items.length,
				totalPages: 1,
				hasNextPage: false,
				hasPrevPage: false
			};
			return { items, pagination };
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
