import { ServerClient } from "./client";
import { trackPageview as _trackPageview } from "./track";
import type { ServerClientOpts, ServerTrackPageviewOpts } from "./types";

const GLOBALS = {
    client: undefined as ServerClient | undefined,
};

export function init(opts: ServerClientOpts) {
    if (GLOBALS.client) {
        return;
    }
    GLOBALS.client = new ServerClient(opts);
}

export function isInitialized() {
    return Boolean(GLOBALS.client);
}

export function getInitializedClient(): (typeof GLOBALS)["client"] {
    return GLOBALS.client;
}

export function trackPageview(opts: ServerTrackPageviewOpts) {
    if (!GLOBALS.client) {
        throw new Error("You must call init() before calling trackPageview().");
    }
    return _trackPageview(GLOBALS.client, opts);
}

export function cleanup() {
    if (!GLOBALS.client) {
        return; // no-op if not already initialized
    }
    GLOBALS.client.cleanup();
    GLOBALS.client = undefined;
}

export type { ServerClientOpts, ServerTrackPageviewOpts } from "./types";
export { ServerClient } from "./client";
