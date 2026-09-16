export interface JwtClaims {
	sub: string;
	roles: string[];
	authorities: string[];
	exp?: number;
}

export function decodeAccessToken(token: string): JwtClaims | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
		const raw = JSON.parse(json) as Partial<JwtClaims>;
		return {
			sub: String(raw.sub ?? ''),
			roles: Array.isArray(raw.roles) ? raw.roles : [],
			authorities: Array.isArray(raw.authorities) ? raw.authorities : [],
			exp: typeof raw.exp === 'number' ? raw.exp : undefined
		};
	} catch {
		return null;
	}
}

export function isExpired(claims: JwtClaims): boolean {
	if (typeof claims.exp !== 'number') return false;
	return claims.exp * 1000 <= Date.now();
}
