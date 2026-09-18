import type { PagedResult } from '$lib/core/types/pagination';
import type {
	CustomerClaimRequest,
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
	update(id: number, payload: CustomerPutRequest): Promise<CustomerResponse>;
	patch(id: number, payload: CustomerPatchRequest): Promise<CustomerResponse>;
	claim(id: number, payload: CustomerClaimRequest): Promise<CustomerResponse>;
	remove(id: number): Promise<void>;
}
