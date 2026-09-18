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
	trackToken: string;
}

export interface OrderListQuery {
	keyword?: string;
	status?: OrderStatus | OrderStatus[];
	page?: number;
	size?: number;
	sort?: string;
}

export type OrderTransition = 'confirm' | 'prepare' | 'ready' | 'complete' | 'cancel';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	CREATED: 'Menunggu',
	CONFIRMED: 'Dikonfirmasi',
	PREPARING: 'Disiapkan',
	READY: 'Siap',
	COMPLETED: 'Selesai',
	CANCELLED: 'Dibatalkan'
};

/** Pemetaan status → token warna (THEME_CONTRACT §3.3). */
const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
	CREATED: 'bg-honey text-ink',
	CONFIRMED: 'bg-sky text-inverted',
	PREPARING: 'bg-ember text-inverted',
	READY: 'bg-grape text-inverted',
	COMPLETED: 'bg-leaf text-inverted',
	CANCELLED: 'bg-danger text-inverted'
};

export interface OrderStep {
	target: OrderStatus;
	action: OrderTransition;
	label: string;
	authority: string;
	variant: 'accent' | 'leaf' | 'danger';
}

/** Transisi status yang legal di BE + authority yang dibutuhkan. */
export const ORDER_STEPS: Record<OrderStatus, OrderStep[]> = {
	CREATED: [
		{ target: 'CONFIRMED', action: 'confirm', label: 'Konfirmasi', authority: 'order.update', variant: 'accent' },
		{ target: 'CANCELLED', action: 'cancel', label: 'Batalkan', authority: 'order.update', variant: 'danger' }
	],
	CONFIRMED: [
		{ target: 'PREPARING', action: 'prepare', label: 'Mulai', authority: 'order.mark.preparing', variant: 'accent' },
		{ target: 'CANCELLED', action: 'cancel', label: 'Batalkan', authority: 'order.update', variant: 'danger' }
	],
	PREPARING: [
		{ target: 'READY', action: 'ready', label: 'Siap', authority: 'order.mark.ready', variant: 'accent' }
	],
	READY: [
		{ target: 'COMPLETED', action: 'complete', label: 'Selesai', authority: 'order.mark.completed', variant: 'leaf' }
	],
	COMPLETED: [],
	CANCELLED: []
};

export function orderStatusLabel(status: OrderStatus | string): string {
	return ORDER_STATUS_LABELS[status as OrderStatus] ?? String(status);
}

export function orderStatusColor(status: OrderStatus | string): string {
	return ORDER_STATUS_COLORS[status as OrderStatus] ?? 'bg-subtle text-ink';
}

export function orderStepVariantClass(step: OrderStep): string {
	if (step.variant === 'danger') return 'bg-danger text-inverted';
	if (step.variant === 'leaf') return 'bg-leaf text-inverted';
	return 'bg-accent text-inverted';
}

/** Langkah berikutnya yang boleh dijalankan user (authority `order.*` = semua). */
export function orderStepsFor(status: OrderStatus, authorities: readonly string[]): OrderStep[] {
	const steps = ORDER_STEPS[status] ?? [];
	return steps.filter(
		(step) => authorities.includes(step.authority) || authorities.includes('order.*')
	);
}

export function nextOrderStep(status: OrderStatus, authorities: readonly string[]): OrderStep | null {
	return orderStepsFor(status, authorities).find((step) => step.action !== 'cancel') ?? null;
}

export interface KitchenTicket {
	orderId: number;
	orderNumber: string;
	type: OrderType;
	status: OrderStatus;
	tableNumber: string | null;
	notes: string | null;
	createdAt: string;
	items: OrderItemResponse[];
}

export interface KitchenListQuery {
	status?: string;
	size?: number;
}

export interface GuestOrderTrackingResponse {
	orderNumber: string;
	type: OrderType;
	status: OrderStatus;
	totalPrice: number;
	createdAt: string;
	invoiceStatus: string | null;
	items: OrderItemResponse[];
}
