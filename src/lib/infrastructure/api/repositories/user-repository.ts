import { API_AUTH } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { PagedResult } from '$lib/core/types/pagination';
import type { UserRepository } from '$lib/domain/ports/user-repository';
import type {
	UserAuthPatchRequest,
	UserAuthPutRequest,
	UserAuthRequest,
	UserAuthResponse,
	UserListQuery
} from '$lib/domain/user';

const BASE = `${API_AUTH}/users`;

export function createUserRepository(http: HttpClient): UserRepository {
	return {
		create: (payload: UserAuthRequest) => http.post<UserAuthResponse>(BASE, payload) as Promise<UserAuthResponse>,
		list: (query?: UserListQuery) => http.getPaged<UserAuthResponse>(BASE, { query }) as Promise<PagedResult<UserAuthResponse>>,
		getById: (id: number) => http.getSingle<UserAuthResponse>(`${BASE}/${id}`) as Promise<UserAuthResponse>,
		update: (id: number, payload: UserAuthPutRequest) =>
			http.put<UserAuthResponse>(`${BASE}/${id}`, payload) as Promise<UserAuthResponse>,
		patch: (id: number, payload: UserAuthPatchRequest) =>
			http.patch<UserAuthResponse>(`${BASE}/${id}`, payload) as Promise<UserAuthResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
