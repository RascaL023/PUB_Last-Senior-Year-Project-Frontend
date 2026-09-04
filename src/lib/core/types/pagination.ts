import type { PaginationMeta } from './api';

export interface PageParams {
	page?: number;
	size?: number;
	sort?: string;
}

export interface PagedResult<T> {
	items: T[];
	pagination: PaginationMeta;
}

export function toQuery(params: object): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === '') continue;
		search.set(key, String(value));
	}
	const query = search.toString();
	return query ? `?${query}` : '';
}
