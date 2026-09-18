import type { PagedResult } from '$lib/core/types/pagination';
import type { RequestOptions } from '$lib/core/http/http-client';
import type { MenuListQuery, MenuPutRequest, MenuRequest, MenuResponse } from '../menu';

export interface MenuRepository {
	create(payload: MenuRequest): Promise<MenuResponse>;
	list(query?: MenuListQuery, options?: RequestOptions): Promise<PagedResult<MenuResponse>>;
	getById(id: number): Promise<MenuResponse>;
	update(id: number, payload: MenuPutRequest): Promise<MenuResponse>;
	restore(id: number): Promise<MenuResponse>;
	remove(id: number): Promise<void>;
}
