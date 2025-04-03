import type { LoaderFunctionArgs } from "react-router";
import { handleCacheHeaders } from "~/analytics/collect";

/**
 * Loader function for the /cache route.
 *
 * This route evaluates the If-Modified-Since header to determine the number of hits
 * within the current session, based on the cookieless tracking logic.
 * It returns this information as JSON and sets the Last-Modified header for the
 * next request.
 */
export async function loader({ request }: LoaderFunctionArgs) {
    const ifModifiedSince = request.headers.get("if-modified-since");

    const { hits, nextLastModifiedDate } = handleCacheHeaders(ifModifiedSince);

    // Return the hit count to the client
    const payload = {
        ht: hits, // Number of hits in the current session (hit type)
    };

    // Return the JSON payload with the appropriate Last-Modified header
    return new Response(JSON.stringify(payload), {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Last-Modified": nextLastModifiedDate.toUTCString(),
            Expires: "Mon, 01 Jan 1990 00:00:00 GMT",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Tk: "N", // not tracking
        },
    });
}
