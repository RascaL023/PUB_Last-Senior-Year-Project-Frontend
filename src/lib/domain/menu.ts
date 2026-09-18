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
	deletedAt: string | null;
}

export interface AdminMenuListQuery {
	name?: string;
	categoryId?: number;
	minPrice?: number;
	maxPrice?: number;
	isAvailable?: boolean;
	deleted?: 'active' | 'deleted' | 'all';
	page?: number;
	size?: number;
	sort?: string;
}

export interface MenuListQuery {
	name?: string;
	categoryId?: number;
	minPrice?: number;
	maxPrice?: number;
	isAvailable?: boolean;
	page?: number;
	size?: number;
	sort?: string;
}
