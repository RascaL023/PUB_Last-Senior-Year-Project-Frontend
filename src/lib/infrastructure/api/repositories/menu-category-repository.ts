import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	MenuCategoryListQuery,
	MenuCategoryPutRequest,
	MenuCategoryRequest,
	MenuCategoryResponse
} from '$lib/domain/menu-category';
import type { MenuCategoryRepository } from '$lib/domain/ports/menu-category-repository';

const BASE = `${API_V1}/menus/categories`;

export function createMenuCategoryRepository(http: HttpClient): MenuCategoryRepository {
	return {
		create: (payload: MenuCategoryRequest) =>
			http.post<MenuCategoryResponse>(BASE, payload) as Promise<MenuCategoryResponse>,
		list: (query?: MenuCategoryListQuery) => http.getPaged<MenuCategoryResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<MenuCategoryResponse>(`${BASE}/${id}`) as Promise<MenuCategoryResponse>,
		update: (id: number, payload: MenuCategoryPutRequest) =>
			http.put<MenuCategoryResponse>(`${BASE}/${id}`, payload) as Promise<MenuCategoryResponse>,
		restore: (id: number) =>
			http.patch<MenuCategoryResponse>(
				`${BASE}/${id}/restore`,
				undefined
			) as Promise<MenuCategoryResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
