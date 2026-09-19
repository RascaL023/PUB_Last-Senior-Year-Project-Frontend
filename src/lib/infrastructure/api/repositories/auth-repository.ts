import { API_AUTH } from '$lib/config/env';
import type { TokenStore } from '$lib/core/auth/token-store';
import type { HttpClient } from '$lib/core/http/http-client';
import type { LoginRequest, LoginResponse, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse } from '$lib/domain/auth';
import type { AuthRepository } from '$lib/domain/ports/auth-repository';

export function createAuthRepository(http: HttpClient, tokens: TokenStore): AuthRepository {
	return {
		async login(payload: LoginRequest): Promise<LoginResponse> {
			const data = await http.post<LoginResponse>(`${API_AUTH}/login`, payload, {
				auth: false
			});
			if (!data) throw new Error('Empty login response');
			tokens.setAccessToken(data.accessToken);
			return data;
		},
		/**
		 * Memakai coordinator refresh milik HTTP client supaya alur restore sesi
		 * dan retry-401 berbagi SATU request refresh (single-flight). Tanpa ini,
		 * dua request refresh bersamaan dapat membuat BE merotasi refresh token
		 * dua kali dan menolak yang kedua.
		 */
		async refresh(): Promise<string> {
			return http.refreshAccessToken();
		},
		async logout(): Promise<void> {
			try {
				await http.postWithoutResponse(`${API_AUTH}/logout`, undefined, { auth: false });
			} finally {
				tokens.clear();
			}
		},
		async logoutAll(): Promise<void> {
			try {
				await http.postWithoutResponse(`${API_AUTH}/logout-all`);
			} finally {
				tokens.clear();
			}
		},
		async forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
			const data = await http.post<ForgotPasswordResponse>(`${API_AUTH}/forgot-password`, payload, {
				auth: false
			});
			if (!data) throw new Error('Empty response');
			return data;
		},
		async resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
			const data = await http.post<ResetPasswordResponse>(`${API_AUTH}/reset-password`, payload, {
				auth: false
			});
			if (!data) throw new Error('Empty response');
			return data;
		}
	};
}
