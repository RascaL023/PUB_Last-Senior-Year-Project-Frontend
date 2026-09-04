import type { PagedResult } from '$lib/core/types/pagination';
import type {
	UserAuthPatchRequest,
	UserAuthPutRequest,
	UserAuthRequest,
	UserAuthResponse,
	UserListQuery
} from '../user';

export interface UserRepository {
	create(payload: UserAuthRequest): Promise<UserAuthResponse>;
	list(query?: UserListQuery): Promise<PagedResult<UserAuthResponse>>;
	getById(id: number): Promise<UserAuthResponse>;
	update(id: number, payload: UserAuthPutRequest): Promise<UserAuthResponse>;
	patch(id: number, payload: UserAuthPatchRequest): Promise<UserAuthResponse>;
	remove(id: number): Promise<void>;
}
