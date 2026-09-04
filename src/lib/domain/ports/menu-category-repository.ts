import type { PagedResult } from '$lib/core/types/pagination';
import type {
	MenuCategoryListQuery,
	MenuCategoryPutRequest,
	MenuCategoryRequest,
	MenuCategoryResponse
} from '../menu-category';

export interface MenuCategoryRepository {
	create(payload: MenuCategoryRequest): Promise<MenuCategoryResponse>;
	list(query?: MenuCategoryListQuery): Promise<PagedResult<MenuCategoryResponse>>;
	getById(id: number): Promise<MenuCategoryResponse>;
	update(id: number, payload: MenuCategoryPutRequest): Promise<MenuCategoryResponse>;
	restore(id: number): Promise<MenuCategoryResponse>;
	remove(id: number): Promise<void>;
}
