import { API_AUTH } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { AuthorityListQuery, AuthorityResponse } from '$lib/domain/authority';
import type { AuthorityRepository } from '$lib/domain/ports/authority-repository';

const BASE = `${API_AUTH}/authorities`;

export function createAuthorityRepository(http: HttpClient): AuthorityRepository {
	return {
		list: (query?: AuthorityListQuery) => http.getPaged<AuthorityResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<AuthorityResponse>(`${BASE}/${id}`) as Promise<AuthorityResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
