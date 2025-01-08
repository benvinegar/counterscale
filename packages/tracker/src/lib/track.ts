import type { Client } from "./client";
import { makeRequest } from "./request";

type TrackPageviewOpts = {
    url?: string;
    referrer?: string;
};

export function trackPageview(client: Client, opts: TrackPageviewOpts = {}) {
    // ignore prerendered pages
    if (
        "visibilityState" in document &&
        (document.visibilityState as string) === "prerender"
    ) {
        return;
    }

    // if <body> did not load yet, try again at dom ready event
    if (document.body === null) {
        document.addEventListener("DOMContentLoaded", () => {
            trackPageview(client);
        });
        return;
    }

    //  parse request, use canonical if there is one
    let req = window.location;

    // do not track if not served over HTTP or HTTPS (eg from local filesystem) and we're not in an Electron app
    if (req.host === "" && navigator.userAgent.indexOf("Electron") < 0) {
        return;
    }

    // find canonical URL
    const canonical = document.querySelector(
        'link[rel="canonical"][href]',
    ) as HTMLLinkElement;
    if (canonical) {
        const a = document.createElement("a");
        a.href = canonical.href;

        // use parsed canonical as location object

        // @ts-expect-error TBH typescript may have a point here and not sure if this works - BV
        req = a;
    }

    let path = opts.url || req.pathname + req.search;
    if (!path) {
        path = "/";
    }
    // strip query string from path
    path = path.split("?")[0];

    // determine hostname
    const hostname = req.protocol + "//" + req.hostname;

    // only set referrer if not internal
    let referrer = opts.referrer || "";
    if (document.referrer.indexOf(hostname) < 0) {
        referrer = document.referrer;
    }
    // strip query string from referrer
    referrer = referrer.split("?")[0];

    const d = {
        p: path,
        h: hostname,
        r: referrer,
        sid: client.siteId,
    };

    makeRequest(client.reporterUrl, d);
}
