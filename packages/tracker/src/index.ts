import { Client } from "./lib/client";
import type { ClientOpts } from "./lib/client";

import { autoTrackPageviews, trackPageview } from "./lib/track";
import type { TrackPageviewOpts } from "./lib/track";

export default function (opts: ClientOpts) {
    const client = new Client(opts);

    return {
        autoTrackPageviews: () => {
            autoTrackPageviews(client);
        },
        trackPageview: (opts: TrackPageviewOpts) => {
            trackPageview(client, opts);
        },
    };
}
