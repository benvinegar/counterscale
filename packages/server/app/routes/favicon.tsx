import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const faviconUrl = url.searchParams.get("url");

    if (!faviconUrl) {
        return new Response("Missing url parameter", { status: 400 });
    }

    try {
        const domain = new URL(faviconUrl).hostname;

        const requestUrl = new URL(request.url);
        const cacheUrl = `${requestUrl.origin}/favicon/${domain}`;

        const cache = context.cloudflare.caches.default;
        const cacheRequest = new Request(cacheUrl);
        const cachedResponse = await cache.match(cacheRequest);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Fetch favicon from Google's service
        const googleFaviconUrl = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(faviconUrl)}&size=128`;

        const faviconResponse = await fetch(googleFaviconUrl);

        if (!faviconResponse.ok) {
            return new Response("Favicon not found", { status: 404 });
        }

        const response = new Response(faviconResponse.body, {
            status: 200,
            headers: {
                "Content-Type":
                    faviconResponse.headers.get("Content-Type") ||
                    "image/x-icon",
                "Cache-Control": "public, max-age=86400", // Cache for 24 hours
                "CDN-Cache-Control": "public, max-age=2592000", // Cache on CDN for 30 days
            },
        });

        const cacheStoreRequest = new Request(cacheUrl);
        context.cloudflare.ctx.waitUntil(
            cache.put(cacheStoreRequest, response.clone()),
        );

        return response;
    } catch (error) {
        console.error("Error fetching favicon:", error);
        return new Response("Error fetching favicon", { status: 500 });
    }
}
