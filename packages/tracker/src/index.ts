import { Client } from "./lib/client";
import { autoTrackPageviews, trackPageview } from "./lib/track";

export default function (siteId: string, reporterUrl: string) {
    const client = new Client({ siteId, reporterUrl });

    return {
        autoTrackPageviews: () => {
            autoTrackPageviews(client);
        },
        trackPageview: () => {
            trackPageview(client);
        },
    };
}
