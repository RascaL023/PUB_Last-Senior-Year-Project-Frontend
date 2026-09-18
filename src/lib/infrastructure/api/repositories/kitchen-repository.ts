import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { KitchenTicket, KitchenListQuery } from '$lib/domain/order';
import type { KitchenRepository } from '$lib/domain/ports/kitchen-repository';

const BASE = `${API_V1}/kitchen/orders`;

export function createKitchenRepository(http: HttpClient): KitchenRepository {
	return {
		list: (query?: KitchenListQuery) => http.getSingle<KitchenTicket[]>(BASE, { query }),
	};
}
