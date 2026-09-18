import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	CustomerClaimRequest,
	CustomerListQuery,
	CustomerPatchRequest,
	CustomerPutRequest,
	CustomerRegisterRequest,
	CustomerRequest,
	CustomerResponse
} from '$lib/domain/customer';
import type { CustomerRepository } from '$lib/domain/ports/customer-repository';

const BASE = `${API_V1}/customers`;

export function createCustomerRepository(http: HttpClient): CustomerRepository {
	return {
		register: (payload: CustomerRegisterRequest) =>
			http.post<CustomerResponse>(`${BASE}/register`, payload, {
				auth: false
			}) as Promise<CustomerResponse>,
		create: (payload: CustomerRequest) =>
			http.post<CustomerResponse>(BASE, payload) as Promise<CustomerResponse>,
		list: (query?: CustomerListQuery) => http.getPaged<CustomerResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<CustomerResponse>(`${BASE}/${id}`) as Promise<CustomerResponse>,
		update: (id: number, payload: CustomerPutRequest) =>
			http.put<CustomerResponse>(`${BASE}/${id}`, payload) as Promise<CustomerResponse>,
		patch: (id: number, payload: CustomerPatchRequest) =>
			http.patch<CustomerResponse>(`${BASE}/${id}`, payload) as Promise<CustomerResponse>,
		claim: (id: number, payload: CustomerClaimRequest) =>
			http.post<CustomerResponse>(`${BASE}/${id}/claim`, payload) as Promise<CustomerResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
