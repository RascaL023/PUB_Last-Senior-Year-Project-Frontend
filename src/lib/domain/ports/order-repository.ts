import type { PagedResult } from '$lib/core/types/pagination';
import type {
	OrderListQuery,
	OrderPatchRequest,
	OrderPutRequest,
	OrderRequest,
	OrderResponse,
	OrderTransition
} from '../order';

export interface OrderRepository {
	create(payload: OrderRequest): Promise<OrderResponse>;
	list(query?: OrderListQuery): Promise<PagedResult<OrderResponse>>;
	getById(id: number): Promise<OrderResponse>;
	update(id: number, payload: OrderPutRequest): Promise<OrderResponse>;
	patch(id: number, payload: OrderPatchRequest): Promise<OrderResponse>;
	remove(id: number): Promise<void>;
	transition(id: number, action: OrderTransition): Promise<OrderResponse>;
}
