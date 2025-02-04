import type { Client } from "./client";
import { instrumentHistoryBuiltIns } from "./instrument";
import { makeRequest } from "./request";

export type TrackPageviewOpts = {
    url?: string;
    referrer?: string;
};

export function autoTrackPageviews(client: Client) {
    const cleanupFn = instrumentHistoryBuiltIns(() => {
        trackPageview(client);
    });

    trackPageview(client);

    return cleanupFn;
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

function getHostnameAndPath(url: string) {
    const a = document.createElement("a");
    a.href = url;

    const hostname = a.protocol + "//" + a.hostname;
    const path = a.pathname;

    return { hostname, path };
}

function getReferrer(hostname: string, referrer: string) {
    if (!referrer && document.referrer.indexOf(hostname) < 0) {
        referrer = document.referrer;
    }

    return referrer.split("?")[0];
}

export function trackPageview(client: Client, opts: TrackPageviewOpts = {}) {
    const canonical = getCanonicalUrl();
    const location = canonical ?? window.location;

    // if no valid hostname (e.g. serving from local filesystem), bail out
    if (location.host === "") {
        return;
    }

    const url = opts.url || location.pathname + location.search || "/";

    const { hostname, path } = getHostnameAndPath(url);
    const referrer = getReferrer(hostname, opts.referrer || "");

    const d = {
        p: path,
        h: hostname,
        r: referrer,
        sid: client.siteId,
    };

    makeRequest(client.reporterUrl, d);
}
