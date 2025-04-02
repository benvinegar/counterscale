type CollectRequestParams = {
    p: string; // path
    h: string; // host
    r: string; // referrer
    sid: string; // siteId
    v?: string; // whether this is a new visit (1 or 0)
    b?: string; // whether this is a bounce (1 or 0)
};

const REQUEST_TIMEOUT = 1000;

type CacheResponse = {
    v: number; // 1 for new visit, 0 for returning visitor
    b: number; // 1 for bounce, 0 for normal, -1 for anti-bounce
};

function queryParamStringify(obj: { [key: string]: string }) {
    return (
        "?" +
        Object.keys(obj)
            .map(function (k) {
                return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
            })
            .join("&")
    );
}

/**
 * Checks the cache status by calling the /cache endpoint
 * @param baseUrl The base URL for the API
 * @param siteId The site ID to include in the cache URL
 * @returns A promise that resolves to the cache status
 */
export function checkCacheStatus(baseUrl: string, siteId: string): Promise<CacheResponse> {
    return new Promise((resolve) => {
        // Default fallback response for any error case
        const fallbackResponse: CacheResponse = {
            v: 1, // Assume new visit
            b: 1, // Assume bounce
        };

        // Replace the final /collect path segment with /cache and add site ID as a query parameter
        // This ensures we don't accidentally replace "collect" if it appears in the hostname or elsewhere
        const cacheUrl = `${baseUrl.replace(/\/collect$/, "/cache")}?sid=${encodeURIComponent(siteId)}`;
        const xhr = new XMLHttpRequest();

        xhr.open("GET", cacheUrl, true);
        xhr.timeout = REQUEST_TIMEOUT;
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(
                        xhr.responseText,
                    ) as CacheResponse;
                    resolve(response);
                } catch {
                    // If parsing fails, use fallback
                    resolve(fallbackResponse);
                }
            } else {
                // If request fails, use fallback
                resolve(fallbackResponse);
            }
        };

        // Use fallback for error cases
        xhr.onerror = () => resolve(fallbackResponse);
        xhr.ontimeout = () => resolve(fallbackResponse);

        xhr.send();
    });
}

/**
 * Makes a request to the collect endpoint
 * @param url The collect endpoint URL
 * @param params The parameters to send
 */
export function makeRequest(url: string, params: CollectRequestParams) {
    const xhr = new XMLHttpRequest();
    const fullUrl = url + queryParamStringify(params);

    xhr.open("GET", fullUrl, true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.timeout = REQUEST_TIMEOUT;
    xhr.send();
}
