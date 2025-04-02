import type { Client } from "./client";
import { instrumentHistoryBuiltIns } from "./instrument";
import { makeRequest, checkCacheStatus } from "./request";

export type TrackPageviewOpts = {
    url?: string;
    referrer?: string;
};

export function autoTrackPageviews(client: Client) {
    const cleanupFn = instrumentHistoryBuiltIns(() => {
        void trackPageview(client);
    });

    void trackPageview(client);

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

export async function trackPageview(
    client: Client,
    opts: TrackPageviewOpts = {},
) {
    const canonical = getCanonicalUrl();
    const location = canonical ?? window.location;

    // if host is empty, we're probably loading a file:/// URI
    // -- exit early if this is not an Electron app
    if (location.host === "" && navigator.userAgent.indexOf("Electron") < 0) {
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

    try {
        const cacheStatus = await checkCacheStatus(client.reporterUrl, client.siteId);

        Object.assign(d, {
            ht: cacheStatus.ht.toString(),
        });
    } catch {
        // If cache check fails, we proceed without hit count data
        // The collect endpoint will handle the missing parameters
    }

    makeRequest(client.reporterUrl, d);
}
