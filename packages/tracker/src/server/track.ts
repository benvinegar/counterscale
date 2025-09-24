import type { ServerClient } from "./client";
import { makeRequest } from "./request";
import type { ServerTrackPageviewOpts } from "./types";

function getHostnameAndPath(url: string) {
    const urlObj = new URL(url);
    const hostname = urlObj.protocol + "//" + urlObj.hostname;
    const path = urlObj.pathname;
    return { hostname, path };
}

function getReferrer(hostname: string, referrer: string) {
    if (!referrer) {
        return "";
    }

    // If referrer is from same hostname, don't track it
    if (referrer.indexOf(hostname) >= 0) {
        return "";
    }

    return referrer.split("?")[0];
}

function getUtmParamsFromUrl(url: string) {
    const utmParams: Record<string, string> = {};

    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmTerm = params.get("utm_term");
    const utmContent = params.get("utm_content");

    if (utmSource) utmParams.us = utmSource;
    if (utmMedium) utmParams.um = utmMedium;
    if (utmCampaign) utmParams.uc = utmCampaign;
    if (utmTerm) utmParams.ut = utmTerm;
    if (utmContent) utmParams.uco = utmContent;

    return utmParams;
}

function getUtmParamsFromOpts(opts: ServerTrackPageviewOpts) {
    const utmParams: Record<string, string> = {};

    if (opts.utmSource) utmParams.us = opts.utmSource;
    if (opts.utmMedium) utmParams.um = opts.utmMedium;
    if (opts.utmCampaign) utmParams.uc = opts.utmCampaign;
    if (opts.utmTerm) utmParams.ut = opts.utmTerm;
    if (opts.utmContent) utmParams.uco = opts.utmContent;

    return utmParams;
}

function isLocalhostAddress(hostname: string): boolean {
    return /^localhost$|^127(?:\.[0-9]+){0,2}\.[0-9]+$|^(?:0*:)*?:?0*1$/.test(
        hostname,
    );
}

export async function trackPageview(
    client: ServerClient,
    opts: ServerTrackPageviewOpts,
) {
    // Validate required parameters
    if (!opts.url) {
        throw new Error("url is required for server-side tracking");
    }

    let fullUrl: string;
    try {
        // If URL is relative, we need a hostname to make it absolute
        if (opts.url.startsWith("/")) {
            if (!opts.hostname) {
                throw new Error(
                    "hostname is required when tracking relative URLs",
                );
            }
            const protocol =
                opts.hostname.startsWith("localhost") ||
                opts.hostname.includes("127.0.0.1")
                    ? "http://"
                    : "https://";
            fullUrl = `${protocol}${opts.hostname}${opts.url}`;
        } else {
            fullUrl = opts.url;
        }

        // Validate URL format
        new URL(fullUrl);
    } catch {
        throw new Error(`Invalid URL: ${opts.url}`);
    }

    const { hostname, path } = getHostnameAndPath(fullUrl);

    // Check localhost reporting setting
    if (
        !client.reportOnLocalhost &&
        isLocalhostAddress(new URL(fullUrl).hostname)
    ) {
        return;
    }

    const referrer = getReferrer(hostname, opts.referrer || "");

    const d: Record<string, string> = {
        p: path,
        h: hostname,
        r: referrer,
        sid: client.siteId,
    };

    // Get UTM params from URL first, then override with explicit opts
    const urlUtmParams = getUtmParamsFromUrl(fullUrl);
    const optsUtmParams = getUtmParamsFromOpts(opts);
    Object.assign(d, urlUtmParams, optsUtmParams);

    // Server-side tracking defaults to hit type 1 (new visit)
    // since we don't have browser session tracking
    d.ht = "1";

    await makeRequest(client.reporterUrl, d as any, client.timeout);
}
