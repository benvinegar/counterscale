import type { LoaderFunctionArgs } from "react-router";

// Bundled at build time via Vite's ?raw suffix. The source file lives at
// app/tracker/tracker.js and is populated by the `copytracker` npm script.
import trackerSource from "../tracker/tracker.js?raw";

export async function loader({ params, context, request }: LoaderFunctionArgs) {
    const requestedScript = params.script;
    if (!requestedScript || !requestedScript.endsWith(".js")) {
        return new Response("Not Found", { status: 404 });
    }

    const customScriptName = context.cloudflare.env.CF_TRACKER_SCRIPT_NAME;
    const defaultScriptName = "tracker";
    const requestedBaseName = requestedScript.replace(".js", "");
    const isDefaultScript = requestedBaseName === defaultScriptName;
    const isCustomScript =
        customScriptName && requestedBaseName === customScriptName;

    if (!isDefaultScript && !isCustomScript) {
        return new Response("Script not found", { status: 404 });
    }

    const allowedOrigin = resolveAllowedOrigin(
        context.cloudflare.env.TRACKER_ALLOWED_ORIGINS,
        request.headers?.get("Origin") ?? null,
    );

    const headers: Record<string, string> = {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": allowedOrigin,
    };
    if (allowedOrigin !== "*") {
        headers.Vary = "Origin";
    }

    return new Response(trackerSource, { status: 200, headers });
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
            originHost === entryHost || originHost.endsWith(`.${entryHost}`)
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
