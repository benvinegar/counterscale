import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, context, request }: LoaderFunctionArgs) {
    const requestedScript = params.script;

    if (!requestedScript || !requestedScript.endsWith(".js")) {
        return new Response("Not Found", { status: 404 });
    }

    const customScriptName = context.cloudflare.env.CF_TRACKER_SCRIPT_NAME;
    const defaultScriptName = "tracker";

    // Extract the base name without extension for comparison
    const requestedBaseName = requestedScript.replace(".js", "");

    // Check if requested script matches either default or custom name
    const isDefaultScript = requestedBaseName === defaultScriptName;
    const isCustomScript =
        customScriptName && requestedBaseName === customScriptName;

    if (!isDefaultScript && !isCustomScript) {
        return new Response("Script not found", { status: 404 });
    }

    try {
        const url = new URL(request.url);
        const trackerUrl = `${url.protocol}//${url.host}/tracker.js`;
        const assetResponse =
            await context.cloudflare.env.ASSETS.fetch(trackerUrl);

        const allowedOrigin = resolveAllowedOrigin(
            context.cloudflare.env.TRACKER_ALLOWED_ORIGINS,
            request.headers?.get("Origin") ?? null,
        );

        const response = new Response(assetResponse.body, assetResponse);
        response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
        if (allowedOrigin !== "*") {
            const vary = response.headers.get("Vary");
            response.headers.set(
                "Vary",
                vary ? `${vary}, Origin` : "Origin",
            );
        }
        return response;
    } catch (error) {
        console.error("Error serving tracker script:", error);
        return new Response("Error serving script", { status: 500 });
    }
}

function resolveAllowedOrigin(
    allowedOriginsVar: string | undefined,
    requestOrigin: string | null,
): string {
    const list = (allowedOriginsVar ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

    if (list.length === 0) {
        return "*";
    }

    if (requestOrigin && originMatchesList(requestOrigin, list)) {
        return requestOrigin;
    }

    return list[0];
}

function originMatchesList(origin: string, list: string[]): boolean {
    let originHost: string;
    try {
        originHost = new URL(origin).hostname.toLowerCase();
    } catch {
        return false;
    }

    return list.some((entry) => {
        const entryHost = extractHost(entry).toLowerCase();
        if (!entryHost) return false;
        return (
            originHost === entryHost ||
            originHost.endsWith(`.${entryHost}`)
        );
    });
}

function extractHost(value: string): string {
    try {
        return new URL(value).hostname;
    } catch {
        return value.replace(/^\*\./, "");
    }
}
