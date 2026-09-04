import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	CreateDiningOrderRequest,
	DiningListQuery,
	DiningResponse,
	OpenDiningRequest
} from '$lib/domain/dining';
import type { DiningRepository } from '$lib/domain/ports/dining-repository';

const BASE = `${API_V1}/dinings`;

export function createDiningRepository(http: HttpClient): DiningRepository {
	return {
		open: (payload: OpenDiningRequest) =>
			http.post<DiningResponse>(BASE, payload) as Promise<DiningResponse>,
		list: (query?: DiningListQuery) => http.getPaged<DiningResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<DiningResponse>(`${BASE}/${id}`) as Promise<DiningResponse>,
		addOrder: (diningId: number, payload: CreateDiningOrderRequest) =>
			http.post<DiningResponse>(`${BASE}/${diningId}/orders`, payload) as Promise<DiningResponse>,
		close: (id: number) =>
			http.post<DiningResponse>(`${BASE}/${id}/close`, undefined) as Promise<DiningResponse>
	};
}
