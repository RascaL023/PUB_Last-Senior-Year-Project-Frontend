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
	status?: EmployeeStatus;
	/** Opsional — null/kosong = peran tidak diubah (mis. PUT /employees/me). */
	roleName?: string;
}

export interface EmployeeRequest {
	name: string;
	email: string;
	password: string;
	roleName: string;
	phone?: string;
	status?: EmployeeStatus;
}

export interface EmployeePatchRequest {
	name?: string;
	phone?: string;
	status?: EmployeeStatus;
	roleName?: string;
}

export interface EmployeeListQuery {
	keyword?: string;
	status?: EmployeeStatus;
	includeDeleted?: boolean;
	page?: number;
	size?: number;
	sort?: string;
}
