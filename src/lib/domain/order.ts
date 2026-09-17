export type OrderStatus =
	| 'CREATED'
	| 'CONFIRMED'
	| 'PREPARING'
	| 'READY'
	| 'COMPLETED'
	| 'CANCELLED';

export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export interface OrderItemModifierRequest {
	id?: number;
	modifierOptionId: number;
}

export interface OrderItemRequest {
	id?: number;
	menuId: number;
	quantity: number;
	modifiers?: OrderItemModifierRequest[];
}

export interface OrderRequest {
	customerId?: number;
	customerName?: string;
	notes?: string;
	type: OrderType;
	items: OrderItemRequest[];
}

export type OrderPutRequest = OrderRequest;

export interface OrderPatchRequest {
	customerName?: string;
	notes?: string;
	type?: OrderType;
	items?: OrderItemRequest[];
}

export interface OrderItemModifierResponse {
	id: number;
	modifierTypeId: number;
	modifierOptionId: number;
	modifierName: string;
	additionalPrice: number;
}

export interface OrderItemResponse {
	id: number;
	menuId: number;
	itemName: string;
	unitPrice: number;
	quantity: number;
	subtotal: number;
	modifiers: OrderItemModifierResponse[];
}

export interface OrderResponse {
	id: number;
	orderNumber: string;
	status: OrderStatus;
	type: OrderType;
	customerId: number | null;
	customerName: string | null;
	notes: string | null;
	totalPrice: number;
	createdAt: string;
	updatedAt: string;
	items: OrderItemResponse[];
}

export interface OrderListQuery {
	keyword?: string;
	status?: OrderStatus;
	page?: number;
	size?: number;
	sort?: string;
}

export type OrderTransition = 'confirm' | 'prepare' | 'ready' | 'complete' | 'cancel';
