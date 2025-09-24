type CollectRequestParams = {
    p: string; // path
    h: string; // host
    r: string; // referrer
    sid: string; // siteId
    ht?: string; // hit type
    us?: string; // utm_source
    um?: string; // utm_medium
    uc?: string; // utm_campaign
    ut?: string; // utm_term
    uco?: string; // utm_content
    [key: string]: string | undefined; // Allow additional string properties
};

function queryParamStringify(obj: { [key: string]: string | undefined }) {
    return (
        "?" +
        Object.keys(obj)
            .filter((k) => obj[k] !== undefined && obj[k] !== "")
            .map(function (k) {
                return (
                    encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]!)
                );
            })
            .join("&")
    );
}

export async function makeRequest(
    url: string,
    params: CollectRequestParams,
    timeout = 1000,
): Promise<void> {
    try {
        const fullUrl = url + queryParamStringify(params);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
            method: "GET",
            headers: {
                "Content-Type": "text/plain",
                "User-Agent": "Counterscale-Tracker-Server/3.2.0",
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Consume the response to free up resources
        await response.text();
    } catch {
        // Don't throw - tracking should be fire-and-forget
        // This includes network errors, timeouts, aborts, etc.
    }
}
