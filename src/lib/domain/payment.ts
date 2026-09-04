export type PaymentTargetType = 'ORDER' | 'DINE_IN';

export type PaymentProvider = 'INTERNAL' | 'XENDIT';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export interface PaymentRequest {
	targetType: PaymentTargetType;
	targetId: number;
	paymentProvider: PaymentProvider;
	paymentDetail?: string;
}

export interface PaymentResponse {
	id: number;
	targetType: PaymentTargetType;
	targetId: number;
	targetReference: string;
	paymentProvider: PaymentProvider;
	paymentMethodName: string | null;
	externalId: string | null;
	invoiceUrl: string | null;
	status: PaymentStatus;
	paymentChannel: string | null;
	paymentDetail: string | null;
	amount: number;
	paidAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentListQuery {
	keyword?: string;
	targetType?: PaymentTargetType;
	targetId?: number;
	status?: PaymentStatus;
	paymentProvider?: PaymentProvider;
	page?: number;
	size?: number;
	sort?: string;
}

export type PaymentTransition = 'expire' | 'fail' | 'refund';
