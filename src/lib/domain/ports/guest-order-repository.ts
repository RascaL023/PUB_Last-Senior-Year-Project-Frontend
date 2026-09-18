import type { GuestOrderTrackingResponse } from '../order';

export interface GuestOrderRepository {
	getByTrackToken(token: string): Promise<GuestOrderTrackingResponse | null>;
}
