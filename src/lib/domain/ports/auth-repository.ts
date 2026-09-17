import type { LoginRequest, LoginResponse, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse } from '../auth';

export interface AuthRepository {
	login(payload: LoginRequest): Promise<LoginResponse>;
	refresh(): Promise<string>;
	logout(): Promise<void>;
	logoutAll(): Promise<void>;
	forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse>;
	resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse>;
}
