export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	id: number;
	email: string;
	accessToken: string;
}

export interface RefreshResponse {
	accessToken: string;
}
