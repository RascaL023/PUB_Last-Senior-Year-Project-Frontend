import type { PagedResult } from '$lib/core/types/pagination';
import type { AuthorityListQuery, AuthorityResponse } from '../authority';

export interface AuthorityRepository {
	list(query?: AuthorityListQuery): Promise<PagedResult<AuthorityResponse>>;
	getById(id: number): Promise<AuthorityResponse>;
	remove(id: number): Promise<void>;
}
