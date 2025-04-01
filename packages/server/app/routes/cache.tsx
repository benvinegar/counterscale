import type { LoaderFunctionArgs } from "react-router";
import { handleCacheHeaders } from "~/analytics/collect";

/**
 * Loader function for the /cache route.
 *
 * This route evaluates the If-Modified-Since header to determine if the request
 * corresponds to a new visit or a bounce, based on the cookieless tracking logic.
 * It returns this information as JSON and sets the Last-Modified header for the
 * next request.
 */
export async function loader({ request }: LoaderFunctionArgs) {
    const ifModifiedSince = request.headers.get("if-modified-since");

    const { isVisit, bounce, nextLastModifiedDate } =
        handleCacheHeaders(ifModifiedSince);

    // Use shorter parameter names for HTTP transmission
    const payload = {
        v: isVisit,  // 1 or 0
        b: bounce,   // -1, 0, or 1
    };

    // Return the JSON payload with the appropriate Last-Modified header
    return new Response(JSON.stringify(payload), {
        headers: {
            "Content-Type": "application/json",
            "Last-Modified": nextLastModifiedDate.toUTCString(),
            // Set restrictive cache control headers to ensure the browser
            // always sends If-Modified-Since for this resource
            "Cache-Control": "no-cache, must-revalidate",
        },
    });
}
