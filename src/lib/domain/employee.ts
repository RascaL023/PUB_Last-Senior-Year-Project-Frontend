export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface EmployeeResponse {
	id: number;
	userAuthId: number | null;
	roleName: string | null;
	name: string;
	email: string;
	phone: string | null;
	status: EmployeeStatus;
	createdAt: string;
	updatedAt: string | null;
	deletedAt: string | null;
}

export interface EmployeePutRequest {
	name: string;
	phone?: string;
}

export interface EmployeeRequest {
	name: string;
	email: string;
	password?: string;
	roleName?: string;
	phone?: string;
}

export interface EmployeePatchRequest {
	name?: string;
	phone?: string;
}

export interface EmployeeListQuery {
	keyword?: string;
	page?: number;
	size?: number;
	sort?: string;
}
