import type { RoleResponse } from './role';

export interface UserAuthRequest {
	email: string;
	password: string;
	roleIds: number[];
}

export type UserAuthPutRequest = UserAuthRequest;

export interface UserAuthPatchRequest {
	email?: string;
	password?: string;
	roleIds?: number[];
}

export interface UserAuthResponse {
	id: number;
	email: string;
	roles: RoleResponse[];
	createdAt: string;
	updatedAt: string;
}

export interface UserListQuery {
	email?: string;
	page?: number;
	size?: number;
	sort?: string;
}
