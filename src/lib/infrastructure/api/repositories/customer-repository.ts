import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { CustomerRegisterRequest, CustomerResponse } from '$lib/domain/customer';
import type { CustomerRepository } from '$lib/domain/ports/customer-repository';

const BASE = `${API_V1}/customers`;

export function createCustomerRepository(http: HttpClient): CustomerRepository {
	return {
		register: (payload: CustomerRegisterRequest) =>
			http.post<CustomerResponse>(BASE, payload, { auth: false }) as Promise<CustomerResponse>
	};
}
