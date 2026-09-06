import { getApi } from '$lib/infrastructure/api/index';
import type { MenuResponse, MenuListQuery } from '$lib/domain/menu';
import type { MenuCategoryResponse } from '$lib/domain/menu-category';
import type { PagedResult } from '$lib/core/types/pagination';
import { toAppError } from '$lib/core/http/error-messages';
import type { AppError } from '$lib/core/http/http-errors';

const api = getApi();

export class MenuStore {
	menus: MenuResponse[] = $state([]);
	categories: MenuCategoryResponse[] = $state([]);
	selectedCategoryId: number | null = $state(null);
	loading = $state(false);
	error: AppError | null = $state(null);
	pagination: { currentPage: number; totalPages: number; totalItems: number } = $state({
		currentPage: 1,
		totalPages: 1,
		totalItems: 0
	});
	private lastPage = 0;
	private lastSize = 6;

	async loadMenus(page = 0, size = 6) {
		this.loading = true;
		this.error = null;
		this.lastPage = page;
		this.lastSize = size;
		try {
			const query: MenuListQuery = { page, size };
			if (this.selectedCategoryId !== null) {
				query.categoryId = this.selectedCategoryId;
			}
			const result: PagedResult<MenuResponse> = await api.menus.list(query);
			this.menus = result.items;
			this.pagination = {
				currentPage: result.pagination.currentPage,
				totalPages: result.pagination.totalPages,
				totalItems: result.pagination.totalItems
			};
		} catch (e) {
			this.error = toAppError(e);
		} finally {
			this.loading = false;
		}
	}

	retry() {
		this.loadMenus(this.lastPage, this.lastSize);
	}

	async loadCategories() {
		try {
			const result: PagedResult<MenuCategoryResponse> = await api.categories.list({ size: 50 });
			this.categories = result.items;
		} catch {
			this.categories = [];
		}
	}

	setCategory(categoryId: number | null) {
		this.selectedCategoryId = categoryId;
		this.loadMenus(0, 6);
	}
}

export const menuStore = new MenuStore();
