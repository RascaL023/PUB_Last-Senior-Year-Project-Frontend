import type { PagedResult } from '$lib/core/types/pagination';
import type {
	EmployeeListQuery,
	EmployeePatchRequest,
	EmployeePutRequest,
	EmployeeRequest,
	EmployeeResponse
} from '../employee';

export interface EmployeeRepository {
	getMe(): Promise<EmployeeResponse>;
	updateMe(payload: EmployeePutRequest): Promise<EmployeeResponse>;
	create(payload: EmployeeRequest): Promise<EmployeeResponse>;
	list(query?: EmployeeListQuery): Promise<PagedResult<EmployeeResponse>>;
	getById(id: number): Promise<EmployeeResponse>;
	update(id: number, payload: EmployeePutRequest): Promise<EmployeeResponse>;
	patch(id: number, payload: EmployeePatchRequest): Promise<EmployeeResponse>;
	restore(id: number): Promise<EmployeeResponse>;
	activate(id: number): Promise<EmployeeResponse>;
	suspend(id: number): Promise<EmployeeResponse>;
	remove(id: number): Promise<void>;
}
