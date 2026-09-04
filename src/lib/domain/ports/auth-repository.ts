import type { LoginRequest, LoginResponse } from '../auth';

export interface AuthRepository {
	login(payload: LoginRequest): Promise<LoginResponse>;
	refresh(): Promise<string>;
	logout(): Promise<void>;
	logoutAll(): Promise<void>;
}
