import { API_V1 } from '$lib/config/env';
import type { HttpClient, RequestOptions } from '$lib/core/http/http-client';
import type { MenuListQuery, MenuPutRequest, MenuRequest, MenuResponse } from '$lib/domain/menu';
import type { MenuRepository } from '$lib/domain/ports/menu-repository';

const BASE = `${API_V1}/menus`;

export function createMenuRepository(http: HttpClient): MenuRepository {
	return {
		create: (payload: MenuRequest) => http.post<MenuResponse>(BASE, payload) as Promise<MenuResponse>,
		list: (query?: MenuListQuery, options?: RequestOptions) => http.getPaged<MenuResponse>(BASE, { query, ...options }),
		getById: (id: number) => http.getSingle<MenuResponse>(`${BASE}/${id}`) as Promise<MenuResponse>,
		update: (id: number, payload: MenuPutRequest) =>
			http.put<MenuResponse>(`${BASE}/${id}`, payload) as Promise<MenuResponse>,
		restore: (id: number) =>
			http.patch<MenuResponse>(`${BASE}/${id}/restore`, undefined) as Promise<MenuResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
