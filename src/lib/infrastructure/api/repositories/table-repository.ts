import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { TableRepository } from '$lib/domain/ports/table-repository';
import type {
	DiningTablePatchRequest,
	DiningTablePutRequest,
	DiningTableRequest,
	DiningTableResponse,
	TableListQuery
} from '$lib/domain/table';

const BASE = `${API_V1}/tables`;

export function createTableRepository(http: HttpClient): TableRepository {
	return {
		create: (payload: DiningTableRequest) =>
			http.post<DiningTableResponse>(BASE, payload) as Promise<DiningTableResponse>,
		list: (query?: TableListQuery) => http.getPaged<DiningTableResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<DiningTableResponse>(`${BASE}/${id}`) as Promise<DiningTableResponse>,
		update: (id: number, payload: DiningTablePutRequest) =>
			http.put<DiningTableResponse>(`${BASE}/${id}`, payload) as Promise<DiningTableResponse>,
		patch: (id: number, payload: DiningTablePatchRequest) =>
			http.patch<DiningTableResponse>(`${BASE}/${id}`, payload) as Promise<DiningTableResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
