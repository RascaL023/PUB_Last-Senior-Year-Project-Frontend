import type { PagedResult } from '$lib/core/types/pagination';
import type {
	RoleListQuery,
	RolePatchRequest,
	RolePutRequest,
	RoleRequest,
	RoleResponse
} from '../role';

export interface RoleRepository {
	create(payload: RoleRequest): Promise<RoleResponse>;
	list(query?: RoleListQuery): Promise<PagedResult<RoleResponse>>;
	getById(id: number): Promise<RoleResponse>;
	update(id: number, payload: RolePutRequest): Promise<RoleResponse>;
	patch(id: number, payload: RolePatchRequest): Promise<RoleResponse>;
	remove(id: number): Promise<void>;
}
