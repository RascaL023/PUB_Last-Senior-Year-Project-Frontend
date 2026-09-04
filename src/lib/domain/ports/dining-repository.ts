import type { PagedResult } from '$lib/core/types/pagination';
import type {
	CreateDiningOrderRequest,
	DiningListQuery,
	DiningResponse,
	OpenDiningRequest
} from '../dining';

export interface DiningRepository {
	open(payload: OpenDiningRequest): Promise<DiningResponse>;
	list(query?: DiningListQuery): Promise<PagedResult<DiningResponse>>;
	getById(id: number): Promise<DiningResponse>;
	addOrder(diningId: number, payload: CreateDiningOrderRequest): Promise<DiningResponse>;
	close(id: number): Promise<DiningResponse>;
}
