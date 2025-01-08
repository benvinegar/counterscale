import { Client } from "./lib/client";
import { trackPageview } from "./lib/track";

export default function (siteId: string, reporterUrl: string) {
    const client = new Client({ siteId, reporterUrl });

    return {
        trackPageview: () => {
            trackPageview(client);
        },
    };
}
