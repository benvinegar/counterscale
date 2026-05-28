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
        .filter((o) => o.length > 0)
        .map(normalizeOriginEntry);

    if (list.length === 0) {
        return "*";
    }

    if (requestOrigin && originMatchesList(requestOrigin, list)) {
        return requestOrigin;
    }

    return list[0];
}

function normalizeOriginEntry(entry: string): string {
    const lower = entry.toLowerCase();
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
        return entry;
    }
    return `https://${entry.replace(/^\*\./, "")}`;
}

function originMatchesList(origin: string, list: string[]): boolean {
    let originUrl: URL;
    try {
        originUrl = new URL(origin);
    } catch {
        return false;
    }
    const originHost = originUrl.hostname.toLowerCase();
    const originScheme = originUrl.protocol;

    return list.some((entry) => {
        let entryUrl: URL;
        try {
            entryUrl = new URL(entry);
        } catch {
            return false;
        }
        if (entryUrl.protocol !== originScheme) {
            return false;
        }
        const entryHost = entryUrl.hostname.toLowerCase();
        return (
            originHost === entryHost || originHost.endsWith(`.${entryHost}`)
        );
    });
}
