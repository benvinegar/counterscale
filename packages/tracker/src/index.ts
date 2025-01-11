import { Client } from "./lib/client";
import type { ClientOpts } from "./lib/client";

import { trackPageview as _trackPageview } from "./lib/track";
import type { TrackPageviewOpts } from "./lib/track";

const GLOBALS = {
    client: undefined as Client | undefined,
};

export function initialize(opts: ClientOpts) {
    if (GLOBALS.client) {
        throw new Error("Counterscale has already been initialized.");
    }
    GLOBALS.client = new Client(opts);
}

export function trackPageview(opts?: TrackPageviewOpts) {
    if (!GLOBALS.client) {
        throw new Error(
            "You must call Counterscale.initialize() before calling Counterscale.trackPageview().",
        );
    }
    _trackPageview(GLOBALS.client, opts);
}

export function cleanup() {
    if (!GLOBALS.client) {
        return; // no-op if not already initialized (TODO: warn?)
    }
    GLOBALS.client.cleanup();
    GLOBALS.client = undefined;
}
