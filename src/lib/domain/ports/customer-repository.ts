import type { PagedResult } from '$lib/core/types/pagination';
import type {
	CustomerListQuery,
	CustomerPatchRequest,
	CustomerPutRequest,
	CustomerRegisterRequest,
	CustomerRequest,
	CustomerResponse
} from '../customer';

export interface CustomerRepository {
	register(payload: CustomerRegisterRequest): Promise<CustomerResponse>;
	create(payload: CustomerRequest): Promise<CustomerResponse>;
	list(query?: CustomerListQuery): Promise<PagedResult<CustomerResponse>>;
	getById(id: number): Promise<CustomerResponse>;
	getMe(): Promise<CustomerResponse>;
	updateMe(payload: CustomerPutRequest): Promise<CustomerResponse>;
	update(id: number, payload: CustomerPutRequest): Promise<CustomerResponse>;
	patch(id: number, payload: CustomerPatchRequest): Promise<CustomerResponse>;
	remove(id: number): Promise<void>;
}
