export type DiningStatus = 'OPEN' | 'CLOSED';

export interface OpenDiningRequest {
	tableId: number;
}

export interface DiningOrderItemModifierRequest {
	modifierOptionId: number;
}

export interface DiningOrderItemRequest {
	menuId: number;
	quantity: number;
	modifiers?: DiningOrderItemModifierRequest[];
}

export interface CreateDiningOrderRequest {
	customerId?: number;
	customerName?: string;
	notes?: string;
	items: DiningOrderItemRequest[];
}

export interface DiningOrderSummary {
	id: number;
	orderNumber: string;
	status: string;
	totalPrice: number;
	createdAt: string;
}

export interface DiningResponse {
	id: number;
	tableId: number;
	tableNumber: string;
	status: DiningStatus;
	totalPrice: number;
	orders: DiningOrderSummary[];
	createdAt: string;
	updatedAt: string;
	closedAt: string | null;
	guestToken: string;
	guestCode: string;
}

export interface DiningListQuery {
	status?: DiningStatus;
	page?: number;
	size?: number;
	sort?: string;
}

export interface MyDiningResponse {
	id: number;
	tableNumber: string;
	status: DiningStatus;
	totalPrice: number;
	createdAt: string;
	closedAt: string | null;
	guestToken: string;
}
