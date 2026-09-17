export type PaymentProvider = 'INTERNAL' | 'XENDIT';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface PaymentRequest {
	invoiceId: number;
	paymentProvider: PaymentProvider;
	paymentDetail?: string;
	amount?: number;
}

export interface PaymentResponse {
	id: number;
	invoiceId: number;
	invoiceNumber: string;
	paymentProvider: PaymentProvider;
	paymentMethodName: string | null;
	externalId: string | null;
	invoiceUrl: string | null;
	status: PaymentStatus;
	paymentChannel: string | null;
	paymentDetail: string | null;
	amount: number;
	appliedAmount: number;
	excessAmount: number;
	paidAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentListQuery {
	invoiceId?: number;
	status?: PaymentStatus;
	paymentProvider?: PaymentProvider;
	page?: number;
	size?: number;
	sort?: string;
}

export type PaymentTransition = 'expire' | 'fail';