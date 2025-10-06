import type { CollectRequestParams } from "../shared/types";
import { buildCollectUrl } from "../shared/request";

export async function makeRequest(
    url: string,
    params: CollectRequestParams,
    timeout = 1000,
): Promise<void> {
    try {
        const fullUrl = buildCollectUrl(url, params, true); // Filter empty strings for server

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
