import type { Client } from "./client";
import { instrumentHistoryBuiltIns } from "./instrument";
import { makeRequest } from "./request";

type TrackPageviewOpts = {
    url?: string;
    referrer?: string;
};

export function autoTrackPageviews(client: Client) {
    instrumentHistoryBuiltIns(() => {
        trackPageview(client);
    });

    trackPageview(client);
}

function getCanonicalUrl() {
    const canonical = document.querySelector(
        'link[rel="canonical"][href]',
    ) as HTMLLinkElement;
    if (!canonical) {
        return null;
    }

    const a = document.createElement("a");
    a.href = canonical.href;
    return a;
}

export function trackPageview(client: Client, opts: TrackPageviewOpts = {}) {
    const canonical = getCanonicalUrl();
    const location = canonical ?? window.location;

    if (location.host === "" && navigator.userAgent.indexOf("Electron") < 0) {
        return;
    }

    const url = opts.url || location.pathname + location.search || "/";
    const path = url.split("?")[0];
    const hostname = location.protocol + "//" + location.hostname;

    let referrer = opts.referrer || "";
    if (document.referrer.indexOf(hostname) < 0) {
        referrer = document.referrer;
    }
    referrer = referrer.split("?")[0];

    const d = {
        p: path,
        h: hostname,
        r: referrer,
        sid: client.siteId,
    };

    makeRequest(client.reporterUrl, d);
}
