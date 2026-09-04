import type { AuthorityResponse } from './authority';

export interface RoleRequest {
	name: string;
	authorityIds: number[];
}

export type RolePutRequest = RoleRequest;

export interface RolePatchRequest {
	name?: string;
	authorityIds?: number[];
}

export interface RoleResponse {
	id: number;
	name: string;
	authorities: AuthorityResponse[];
	createdAt: string;
	updatedAt: string;
}

export interface RoleListQuery {
	name?: string;
	page?: number;
	size?: number;
	sort?: string;
}
