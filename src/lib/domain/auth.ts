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

export interface ForgotPasswordRequest {
	email: string;
}

export interface ForgotPasswordResponse {
	message: string;
}

export interface ResetPasswordRequest {
	token: string;
	password: string;
}

export interface ResetPasswordResponse {
	message: string;
}
