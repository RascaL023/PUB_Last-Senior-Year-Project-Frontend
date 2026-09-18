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

export interface GuestOrderItemModifierResponse {
	modifierOptionId: number;
	modifierName: string;
	additionalPrice: number;
}

export interface GuestOrderItemResponse {
	orderItemId: number;
	menuId: number;
	itemName: string;
	unitPrice: number;
	quantity: number;
	subtotal: number;
	modifiers: GuestOrderItemModifierResponse[];
}

export interface GuestOrderSummary {
	orderNumber: string;
	status: string;
	totalPrice: number;
	createdAt: string;
	items: GuestOrderItemResponse[];
}

export interface GuestDiningResponse {
	tableNumber: string;
	status: string;
	totalPrice: number;
	invoiceStatus: string | null;
	orders: GuestOrderSummary[];
}
