import jwt from 'jsonwebtoken';

/**
 * Authentication utilities for Counterscale
 */

// JWT token expiration time (24 hours)
const TOKEN_EXPIRATION = 24 * 60 * 60;

// Cookie name for the session token
export const AUTH_COOKIE_NAME = "counterscale_session";

/**
 * Create a JWT token for authentication
 */
export async function createToken(
    username: string,
    secret: string,
): Promise<string> {
    return jwt.sign(
        { sub: username },
        secret,
        { expiresIn: TOKEN_EXPIRATION }
    );
}

/**
 * Custom error class for token verification failures
 */
export class TokenVerificationError extends Error {
    constructor(
        message: string,
        public originalError?: unknown,
    ) {
        super(message);
        this.name = "TokenVerificationError";
    }
}

/**
 * Verify a JWT token
 */
export async function verifyToken(
    token: string,
    secret: string,
): Promise<boolean> {
    try {
        jwt.verify(token, secret);
        return true;
    } catch (error) {
        // Instead of throwing, log the error (if not in test) and return false
        if (process.env.NODE_ENV !== "test") {
            console.error(
                new TokenVerificationError("Failed to verify token", error),
            );
        }
        return false;
    }
}

/**
 * Get token from cookies
 */
export function getTokenFromCookies(request: Request): string | null {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    console.log("cookieHeader:", cookieHeader);

    // Parse cookies more carefully to handle = characters in values
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(";").forEach(cookie => {
        const cookieParts = cookie.trim();
        const equalsIndex = cookieParts.indexOf("=");
        
        if (equalsIndex > 0) {
            const key = cookieParts.substring(0, equalsIndex);
            const value = cookieParts.substring(equalsIndex + 1);
            cookies[key] = value;
        }
    });

    console.log("cookies:", cookies);

    return cookies[AUTH_COOKIE_NAME] || null;
}

/**
 * Create a response with auth cookie
 */
export function createResponseWithAuthCookie(
    responseData: any,
    token: string,
    status = 200,
): Response {
    return new Response(JSON.stringify(responseData), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${TOKEN_EXPIRATION}`,
        },
    });
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(): Response {
    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`,
        },
    });
}
