export interface GuestOrderItemModifierRequest {
	modifierOptionId: number;
}

export interface GuestOrderItemRequest {
	menuId: number;
	quantity: number;
	modifiers?: GuestOrderItemModifierRequest[];
}

export interface GuestOrderRequest {
	customerName?: string;
	notes?: string;
	items: GuestOrderItemRequest[];
}

export interface GuestOrderSummary {
	status: string;
	totalPrice: number;
	createdAt: string;
}

export interface GuestDiningResponse {
	tableNumber: string;
	status: string;
	totalPrice: number;
	invoiceStatus: string | null;
	orders: GuestOrderSummary[];
}
