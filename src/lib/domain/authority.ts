export interface AuthorityResponse {
	id: number;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthorityListQuery {
	name?: string;
	page?: number;
	size?: number;
	sort?: string;
}
