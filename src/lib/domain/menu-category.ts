export interface MenuCategoryRequest {
	displayName: string;
	categoryCode: string;
	displayOrder: number;
}

export type MenuCategoryPutRequest = MenuCategoryRequest;

export interface MenuCategoryResponse {
	id: number;
	name: string;
	categoryCode: string;
	displayOrder: number;
}

export interface MenuCategoryListQuery {
	name?: string;
	page?: number;
	size?: number;
	sort?: string;
}
