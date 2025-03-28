import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { verifyToken, getTokenFromCookies } from "~/lib/auth";

// Routes that should be excluded from authentication
const PUBLIC_ROUTES = ["/collect"];

/**
 * Check if a route should be protected by authentication
 */
export function shouldProtectRoute(pathname: string): boolean {
    // Skip authentication for public routes
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        return false;
    }

    // Skip authentication for login route to avoid redirect loop
    if (pathname === "/login") {
        return false;
    }

    return true;
}

/**
 * Check if the request is authenticated
 */
export async function isAuthenticated(
    request: Request,
    jwtSecret: string,
): Promise<boolean> {
    // Get JWT from cookies
    const token = getTokenFromCookies(request);

    console.log(token);
    // If no token, not authenticated
    if (!token) {
        return false;
    }

    try {
        // Verify token
        return await verifyToken(token, jwtSecret);
    } catch (error) {
        // Silently handle token verification errors
        return false;
    }
}

/**
 * Authentication middleware for React Router loaders and actions
 */
export function createAuthLoader(
    loaderFn: (args: LoaderFunctionArgs) => Promise<Response> | Response | any,
) {
    return async (args: LoaderFunctionArgs) => {
        const { request, context } = args;
        const url = new URL(request.url);

        // Skip authentication for non-protected routes
        if (!shouldProtectRoute(url.pathname)) {
            return loaderFn(args);
        }

        // Get JWT secret from environment
        const jwtSecret =
            context.cloudflare.env.JWT_SECRET || "dev_secret_key_for_testing";

        if (!jwtSecret) {
            console.error("JWT_SECRET environment variable is not set");
            return new Response(
                JSON.stringify({ error: "Server configuration error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        // Check if authenticated
        const authenticated = await isAuthenticated(request, jwtSecret);

        if (!authenticated) {
            return redirect("/login");
        }

        // User is authenticated, proceed with the original loader
        return loaderFn(args);
    };
}
