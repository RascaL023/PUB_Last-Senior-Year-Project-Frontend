import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	ModifierListQuery,
	ModifierTypePutRequest,
	ModifierTypeRequest,
	ModifierTypeResponse
} from '$lib/domain/modifier';
import type { ModifierRepository } from '$lib/domain/ports/modifier-repository';

const BASE = `${API_V1}/menus/modifiers`;

export function createModifierRepository(http: HttpClient): ModifierRepository {
	return {
		create: (payload: ModifierTypeRequest) =>
			http.post<ModifierTypeResponse>(BASE, payload) as Promise<ModifierTypeResponse>,
		list: (query?: ModifierListQuery) => http.getPaged<ModifierTypeResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<ModifierTypeResponse>(`${BASE}/${id}`) as Promise<ModifierTypeResponse>,
		update: (id: number, payload: ModifierTypePutRequest) =>
			http.put<ModifierTypeResponse>(`${BASE}/${id}`, payload) as Promise<ModifierTypeResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
