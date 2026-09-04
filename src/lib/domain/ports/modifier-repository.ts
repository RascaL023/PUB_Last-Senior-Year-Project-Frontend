import type { PagedResult } from '$lib/core/types/pagination';
import type {
	ModifierListQuery,
	ModifierTypePutRequest,
	ModifierTypeRequest,
	ModifierTypeResponse
} from '../modifier';

export interface ModifierRepository {
	create(payload: ModifierTypeRequest): Promise<ModifierTypeResponse>;
	list(query?: ModifierListQuery): Promise<PagedResult<ModifierTypeResponse>>;
	getById(id: number): Promise<ModifierTypeResponse>;
	update(id: number, payload: ModifierTypePutRequest): Promise<ModifierTypeResponse>;
	remove(id: number): Promise<void>;
}
