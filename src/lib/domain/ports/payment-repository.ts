import type { PagedResult } from '$lib/core/types/pagination';
import type {
	PaymentListQuery,
	PaymentRequest,
	PaymentResponse,
	PaymentTransition
} from '../payment';

export interface PaymentRepository {
	create(payload: PaymentRequest): Promise<PaymentResponse>;
	list(query?: PaymentListQuery): Promise<PagedResult<PaymentResponse>>;
	getById(id: number): Promise<PaymentResponse>;
	transition(id: number, action: PaymentTransition): Promise<PaymentResponse>;
}
