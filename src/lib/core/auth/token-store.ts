export interface TokenStore {
	getAccessToken(): string | null;
	setAccessToken(token: string): void;
	clear(): void;
}

export function createInMemoryTokenStore(): TokenStore {
	let accessToken: string | null = null;
	return {
		getAccessToken: () => accessToken,
		setAccessToken: (token: string) => {
			accessToken = token;
		},
		clear: () => {
			accessToken = null;
		}
	};
}
