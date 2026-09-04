export interface ModifierOptionRequest {
	name: string;
	additionalPrice: number;
}

export interface ModifierTypeRequest {
	name: string;
	minSelection: number;
	maxSelection: number;
	options: ModifierOptionRequest[];
}

export interface ModifierOptionPutRequest {
	id?: number;
	name: string;
	additionalPrice: number;
}

export interface ModifierTypePutRequest {
	name: string;
	minSelection: number;
	maxSelection: number;
	options: ModifierOptionPutRequest[];
}

export interface ModifierOptionResponse {
	id: number;
	name: string;
	additionalPrice: number;
}

export interface ModifierTypeResponse {
	id: number;
	name: string;
	minSelection: number;
	maxSelection: number;
	options: ModifierOptionResponse[];
}

export interface ModifierListQuery {
	name?: string;
	page?: number;
	size?: number;
	sort?: string;
}
