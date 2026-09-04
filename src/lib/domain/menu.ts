import type { MenuCategoryResponse } from './menu-category';
import type { ModifierTypeResponse } from './modifier';

export interface MenuRequest {
	name: string;
	categoryIds: number[];
	description?: string;
	imageUrls?: string[];
	basePrice: number;
	isAvailable?: boolean;
	ModifierTypeIds?: number[];
}

export type MenuPutRequest = MenuRequest;

export interface MenuResponse {
	id: number;
	name: string;
	description: string | null;
	categories: MenuCategoryResponse[];
	imageUrls: string[];
	basePrice: number;
	isAvailable: boolean;
	createdAt: string;
	updatedAt: string;
	modifierTypes: ModifierTypeResponse[];
}

export interface MenuListQuery {
	name?: string;
	categoryId?: number;
	page?: number;
	size?: number;
	sort?: string;
}
