export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

export interface InvoiceItemRequest {
	description: string;
	quantity: number;
	unitPrice: number;
}

export interface InvoiceRequest {
	diningId?: number;
	orderId?: number;
	customerId?: number;
	customerName?: string;
	items?: InvoiceItemRequest[];
}

export interface InvoiceItemResponse {
	id: number;
	orderItemId: number;
	orderId: number;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
}

export interface InvoiceResponse {
	id: number;
	invoiceNumber: string;
	diningId: number | null;
	status: InvoiceStatus;
	totalAmount: number;
	paidAmount: number;
	remainingAmount: number;
	issuedAt: string;
	createdAt: string;
	updatedAt: string;
	customerId: number | null;
	customerName: string | null;
	items: InvoiceItemResponse[];
}

export interface InvoiceListQuery {
	keyword?: string;
	status?: InvoiceStatus;
	diningId?: number;
	orderId?: number;
	page?: number;
	size?: number;
	sort?: string;
}
