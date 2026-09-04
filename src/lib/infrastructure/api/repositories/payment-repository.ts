import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	PaymentListQuery,
	PaymentRequest,
	PaymentResponse,
	PaymentTransition
} from '$lib/domain/payment';
import type { PaymentRepository } from '$lib/domain/ports/payment-repository';

const BASE = `${API_V1}/payments`;

export function createPaymentRepository(http: HttpClient): PaymentRepository {
	return {
		create: (payload: PaymentRequest) =>
			http.post<PaymentResponse>(BASE, payload) as Promise<PaymentResponse>,
		list: (query?: PaymentListQuery) => http.getPaged<PaymentResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<PaymentResponse>(`${BASE}/${id}`) as Promise<PaymentResponse>,
		transition: (id: number, action: PaymentTransition) =>
			http.post<PaymentResponse>(`${BASE}/${id}/${action}`, undefined) as Promise<PaymentResponse>
	};
}
