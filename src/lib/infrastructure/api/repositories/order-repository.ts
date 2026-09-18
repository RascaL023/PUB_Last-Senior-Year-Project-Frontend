import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	OrderListQuery,
	OrderPatchRequest,
	OrderPutRequest,
	OrderRequest,
	OrderResponse,
	OrderTransition
} from '$lib/domain/order';
import type { OrderRepository } from '$lib/domain/ports/order-repository';

const BASE = `${API_V1}/orders`;

export function createOrderRepository(http: HttpClient): OrderRepository {
	return {
		create: (payload: OrderRequest) =>
			http.post<OrderResponse>(BASE, payload) as Promise<OrderResponse>,
		list: (query?: OrderListQuery) => http.getPaged<OrderResponse>(BASE, { query }),
		getById: (id: number) => http.getSingle<OrderResponse>(`${BASE}/${id}`) as Promise<OrderResponse>,
		update: (id: number, payload: OrderPutRequest) =>
			http.put<OrderResponse>(`${BASE}/${id}`, payload) as Promise<OrderResponse>,
		patch: (id: number, payload: OrderPatchRequest) =>
			http.patch<OrderResponse>(`${BASE}/${id}`, payload) as Promise<OrderResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`),
		transition: (id: number, action: OrderTransition) =>
			http.post<OrderResponse>(`${BASE}/${id}/${action}`, undefined) as Promise<OrderResponse>,
		myOrders: (query?: OrderListQuery) => http.getPaged<OrderResponse>(`${API_V1}/my/orders`, { query })
	};
}
