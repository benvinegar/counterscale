import type { LoaderFunctionArgs } from "react-router";

// Bundled at build time via Vite's ?raw suffix. The source file lives at
// app/tracker/tracker.js and is populated by the `copytracker` npm script.
import trackerSource from "../tracker/tracker.js?raw";

export async function loader({ params, context }: LoaderFunctionArgs) {
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

    // The script is served with a wildcard ACAO. CORS cannot gate who loads a
    // <script>, so an allowlist here would enforce nothing (and would only
    // matter for crossorigin/SRI loads, which a wildcard satisfies). A static
    // "*" also avoids Vary: Origin fragmenting the CDN cache. Allowed-origin
    // enforcement lives in /collect, where data actually gets recorded.
    const headers: Record<string, string> = {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
    };

    return new Response(trackerSource, { status: 200, headers });
}
