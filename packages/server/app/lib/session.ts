const SESSION_MAX_AGE_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function createJWTCookie(token: string): string {
    const secure = import.meta.env.PROD ? "; Secure" : "";

    return `__counterscale_token=${token}; HttpOnly; Max-Age=${SESSION_MAX_AGE_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

export function clearJWTCookie(): string {
    const secure = import.meta.env.PROD ? "; Secure" : "";

    return `__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}
