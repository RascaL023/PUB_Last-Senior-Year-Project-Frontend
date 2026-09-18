import type { HttpClient } from '$lib/core/http/http-client';
import type {
	GuestDiningResponse,
	GuestOrderRequest
} from '$lib/domain/guest-dining';
import type { GuestDiningRepository } from '$lib/domain/ports/guest-dining-repository';

const BASE = '/api/v1/guest/dinings';

export function createGuestDiningRepository(http: HttpClient): GuestDiningRepository {
	return {
		getByToken: (token: string) =>
			http.getSingle<GuestDiningResponse>(`${BASE}/${token}`, { auth: false }),
		getByCode: (code: string) =>
			http.getSingle<GuestDiningResponse>(`${BASE}/by-code/${code}`, { auth: false }),
		addOrder: (token: string, payload: GuestOrderRequest) =>
			http.post<GuestDiningResponse>(`${BASE}/${token}/orders`, payload, { auth: false }) as Promise<GuestDiningResponse>
	};
}
