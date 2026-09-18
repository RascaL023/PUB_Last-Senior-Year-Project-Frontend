import type { KitchenTicket, KitchenListQuery } from '$lib/domain/order';

export interface KitchenRepository {
	list: (query?: KitchenListQuery) => Promise<KitchenTicket[] | null>;
}

export type { KitchenListQuery };
