import type { CustomerRegisterRequest, CustomerResponse } from '../customer';

export interface CustomerRepository {
	register(payload: CustomerRegisterRequest): Promise<CustomerResponse>;
}
