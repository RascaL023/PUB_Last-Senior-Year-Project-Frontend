import type { PagedResult } from '../types/pagination';

export interface RequestOptions {
	query?: object;
	auth?: boolean;
}

export interface HttpClient {
	/**
	 * Minta access token baru lewat cookie refresh.
	 * Single-flight: pemanggil yang bersamaan berbagi satu request refresh.
	 */
	refreshAccessToken(): Promise<string>;
	getSingle<T>(path: string, options?: RequestOptions): Promise<T | null>;
	getPaged<T>(path: string, options?: RequestOptions): Promise<PagedResult<T>>;
	post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null>;
	put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null>;
	patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T | null>;
	remove(path: string, options?: RequestOptions): Promise<void>;
	postWithoutResponse(path: string, body?: unknown, options?: RequestOptions): Promise<void>;
}
