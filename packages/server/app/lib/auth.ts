// Use Response API directly instead of json helper

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
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const header = {
        alg: "HS256",
        typ: "JWT",
    };

    const payload = {
        sub: username,
        exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION,
        iat: Math.floor(Date.now() / 1000),
    };

    const headerString = btoa(JSON.stringify(header));
    const payloadString = btoa(JSON.stringify(payload));
    const toSign = `${headerString}.${payloadString}`;

    const signature = await crypto.subtle.sign(
        "HMAC",
        secretKey,
        encoder.encode(toSign),
    );

    // Convert the signature to base64
    const signatureString = btoa(
        String.fromCharCode(...new Uint8Array(signature)),
    );

    return `${headerString}.${payloadString}.${signatureString}`;
}

/**
 * Verify a JWT token
 */
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

export async function verifyToken(
    token: string,
    secret: string,
): Promise<boolean> {
    try {
        console.log("verifyToken");
        const [headerString, payloadString, signatureString] = token.split(".");

        console.log(headerString, payloadString, signatureString);
        if (!headerString || !payloadString || !signatureString) {
            return false;
        }

        // Decode payload to check expiration
        const payload = JSON.parse(atob(payloadString));
        const currentTime = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < currentTime) {
            console.log("Token expired");
            return false; // Token expired
        }

        // Verify signature
        const encoder = new TextEncoder();
        const secretKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"],
        );

        const toVerify = `${headerString}.${payloadString}`;
        const signature = new Uint8Array(
            atob(signatureString)
                .split("")
                .map((c) => c.charCodeAt(0)),
        );

        return await crypto.subtle.verify(
            "HMAC",
            secretKey,
            signature,
            encoder.encode(toVerify),
        );
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
