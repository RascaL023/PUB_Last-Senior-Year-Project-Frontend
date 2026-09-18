import type { HttpClient } from '$lib/core/http/http-client';
import type { GuestOrderTrackingResponse } from '$lib/domain/order';
import type { GuestOrderRepository } from '$lib/domain/ports/guest-order-repository';

const BASE = '/api/v1/guest/orders';

export function createGuestOrderRepository(http: HttpClient): GuestOrderRepository {
	return {
		getByTrackToken: (token: string) =>
			http.getSingle<GuestOrderTrackingResponse>(`${BASE}/${token}`, { auth: false })
	};
}
