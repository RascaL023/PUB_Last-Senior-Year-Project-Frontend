export interface CustomerRegisterRequest {
	name: string;
	email: string;
	password: string;
	phone?: string;
}

export interface CustomerRequest {
	name: string;
	email?: string;
	phone?: string;
	notes?: string;
}

export type CustomerPutRequest = CustomerRequest;

export interface CustomerPatchRequest {
	name?: string;
	email?: string;
	phone?: string;
	notes?: string;
}

export interface CustomerListQuery {
	keyword?: string;
	page?: number;
	size?: number;
	sort?: string;
}

export interface CustomerResponse {
	id: number;
	userAuthId: number | null;
	name: string;
	email: string;
	phone: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string | null;
}
