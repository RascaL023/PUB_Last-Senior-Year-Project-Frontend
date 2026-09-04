import type { PagedResult } from '$lib/core/types/pagination';
import type {
	DiningTablePatchRequest,
	DiningTablePutRequest,
	DiningTableRequest,
	DiningTableResponse,
	TableListQuery
} from '../table';

export interface TableRepository {
	create(payload: DiningTableRequest): Promise<DiningTableResponse>;
	list(query?: TableListQuery): Promise<PagedResult<DiningTableResponse>>;
	getById(id: number): Promise<DiningTableResponse>;
	update(id: number, payload: DiningTablePutRequest): Promise<DiningTableResponse>;
	patch(id: number, payload: DiningTablePatchRequest): Promise<DiningTableResponse>;
	remove(id: number): Promise<void>;
}
