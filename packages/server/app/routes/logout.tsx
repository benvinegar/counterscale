import type { ActionFunctionArgs } from "react-router";
import { AUTH_COOKIE_NAME } from "~/lib/auth";

/**
 * Logout action - clears the auth cookie and redirects to home page
 */
export async function action(_args: ActionFunctionArgs) {
    // Create a direct Response object with both redirect and cookie-clearing headers
    return new Response(null, {
        status: 302, // HTTP redirect status
        headers: {
            Location: "/", // Redirect to home page
            "Set-Cookie": `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        },
    });
}

/**
 * Redirect to home page if someone tries to access this route directly
 */
export function loader() {
    // Create a direct Response object with redirect header
    return new Response(null, {
        status: 302, // HTTP redirect status
        headers: {
            Location: "/", // Redirect to home page
        },
    });
}
