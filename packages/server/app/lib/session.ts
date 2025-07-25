export function createJWTCookie(token: string): string {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = import.meta.env.PROD ? "; Secure" : "";
  
  return `__counterscale_token=${token}; HttpOnly; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function clearJWTCookie(): string {
  const secure = import.meta.env.PROD ? "; Secure" : "";
  
  return `__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}
