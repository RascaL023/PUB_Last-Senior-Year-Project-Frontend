export interface CustomerRegisterRequest {
	name: string;
	email: string;
	password: string;
	phone?: string;
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
