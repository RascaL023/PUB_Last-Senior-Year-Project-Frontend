import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type {
	EmployeeListQuery,
	EmployeePatchRequest,
	EmployeePutRequest,
	EmployeeRequest,
	EmployeeResponse
} from '$lib/domain/employee';
import type { EmployeeRepository } from '$lib/domain/ports/employee-repository';

const BASE = `${API_V1}/employees`;

export function createEmployeeRepository(http: HttpClient): EmployeeRepository {
	return {
		getMe: () => http.getSingle<EmployeeResponse>(`${BASE}/me`) as Promise<EmployeeResponse>,
		updateMe: (payload: EmployeePutRequest) =>
			http.put<EmployeeResponse>(`${BASE}/me`, payload) as Promise<EmployeeResponse>,
		create: (payload: EmployeeRequest) =>
			http.post<EmployeeResponse>(BASE, payload) as Promise<EmployeeResponse>,
		list: (query?: EmployeeListQuery) => http.getPaged<EmployeeResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<EmployeeResponse>(`${BASE}/${id}`) as Promise<EmployeeResponse>,
		update: (id: number, payload: EmployeePutRequest) =>
			http.put<EmployeeResponse>(`${BASE}/${id}`, payload) as Promise<EmployeeResponse>,
		patch: (id: number, payload: EmployeePatchRequest) =>
			http.patch<EmployeeResponse>(`${BASE}/${id}`, payload) as Promise<EmployeeResponse>,
		restore: (id: number) =>
			http.patch<EmployeeResponse>(`${BASE}/${id}/restore`, undefined) as Promise<EmployeeResponse>,
		activate: (id: number) =>
			http.post<EmployeeResponse>(`${BASE}/${id}/activate`, undefined) as Promise<EmployeeResponse>,
		suspend: (id: number) =>
			http.post<EmployeeResponse>(`${BASE}/${id}/suspend`, undefined) as Promise<EmployeeResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
