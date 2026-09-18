import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { AdminMenuListQuery, MenuResponse } from '$lib/domain/menu';
import type { AdminMenuRepository } from '$lib/domain/ports/admin-menu-repository';

const BASE = `${API_V1}/admin/menus`;

export function createAdminMenuRepository(http: HttpClient): AdminMenuRepository {
	return {
		search: (query?: AdminMenuListQuery) => http.getPaged<MenuResponse>(`${BASE}/search`, { query }),
		getById: (id: number) => http.getSingle<MenuResponse>(`${BASE}/${id}`)
	};
}
