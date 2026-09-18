import type { GuestDiningResponse, GuestOrderRequest } from '../guest-dining';

export interface GuestDiningRepository {
	getByToken(token: string): Promise<GuestDiningResponse | null>;
	getByCode(code: string): Promise<GuestDiningResponse | null>;
	addOrder(token: string, payload: GuestOrderRequest): Promise<GuestDiningResponse>;
}
