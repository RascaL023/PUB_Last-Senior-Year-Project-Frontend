import type { PagedResult } from '$lib/core/types/pagination';
import type { AdminMenuListQuery, MenuResponse } from '../menu';

export interface AdminMenuRepository {
	search(query?: AdminMenuListQuery): Promise<PagedResult<MenuResponse>>;
	getById(id: number): Promise<MenuResponse | null>;
}
