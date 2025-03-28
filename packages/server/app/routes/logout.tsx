import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { clearAuthCookie } from "~/lib/auth";

/**
 * Logout action - clears the auth cookie and redirects to login
 */
export async function action({ request }: ActionFunctionArgs) {
    // Clear the auth cookie
    const response = clearAuthCookie();
    
    // Add a redirect header
    response.headers.set("Location", "/login");
    
    return redirect("/login", {
        headers: {
            "Set-Cookie": "counterscale_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0",
        },
    });
}

/**
 * Redirect to login page if someone tries to access this route directly
 */
export function loader() {
    return redirect("/login");
}
