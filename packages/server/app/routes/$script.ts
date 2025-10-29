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
        return await context.cloudflare.env.ASSETS.fetch(trackerUrl)
    } catch (error) {
        console.error("Error serving tracker script:", error);
        return new Response("Error serving script", { status: 500 });
    }
}
