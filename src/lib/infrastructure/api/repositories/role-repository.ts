import { API_AUTH } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { RoleRepository } from '$lib/domain/ports/role-repository';
import type { RoleListQuery, RolePatchRequest, RolePutRequest, RoleRequest, RoleResponse } from '$lib/domain/role';

const BASE = `${API_AUTH}/roles`;

export function createRoleRepository(http: HttpClient): RoleRepository {
	return {
		create: (payload: RoleRequest) => http.post<RoleResponse>(BASE, payload) as Promise<RoleResponse>,
		list: (query?: RoleListQuery) => http.getPaged<RoleResponse>(BASE, { query }),
		getById: (id: number) => http.getSingle<RoleResponse>(`${BASE}/${id}`) as Promise<RoleResponse>,
		update: (id: number, payload: RolePutRequest) =>
			http.put<RoleResponse>(`${BASE}/${id}`, payload) as Promise<RoleResponse>,
		patch: (id: number, payload: RolePatchRequest) =>
			http.patch<RoleResponse>(`${BASE}/${id}`, payload) as Promise<RoleResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
