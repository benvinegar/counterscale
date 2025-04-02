import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";
import { IDevice, UAParser } from "ua-parser-js";
import { maskBrowserVersion } from "~/lib/utils";

// Cookieless visitor/session tracking
// Uses the approach described here: https://notes.normally.com/cookieless-unique-visitor-counts/

function getMidnightDate(): Date {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return midnight;
}

function getNextLastModifiedDate(current: Date | null): Date {
    // in case date is an 'Invalid Date'
    if (current && isNaN(current.getTime())) {
        current = null;
    }

    const midnight = getMidnightDate();

    // check if new day, if it is then set to midnight
    let next = current ? current : midnight;
    next = midnight.getTime() - next.getTime() > 0 ? midnight : next;

    // Get the current seconds value
    const currentSeconds = next.getSeconds();
    
    // We only care about 3 states:
    // 0 seconds: First visit (will become 1 after increment)
    // 1 second: Anti-bounce (will become 2 after increment)
    // 2 seconds: Regular pageview (will become 3 after increment)
    // Any value > 2 should remain at 2 (will become 3 after increment)
    const cappedSeconds = currentSeconds > 2 ? 2 : currentSeconds;
    
    // Reset seconds to the capped value
    next.setSeconds(cappedSeconds);
    
    // increment counter (max value will be 3)
    next.setSeconds(next.getSeconds() + 1);
    return next;
}

function getBounceValue(nextLastModifiedDate: Date | null): number {
    if (!nextLastModifiedDate) {
        return 0;
    }

    const midnight = getMidnightDate();

    // NOTE: minus one because this is the response last modified date
    const visits =
        (nextLastModifiedDate.getTime() - midnight.getTime()) / 1000 - 1;

    switch (visits) {
        case 0:
            return 1;
        case 1:
            return -1;
        default:
            return 0;
    }
}

/**
 * Checks if the request indicates a new visitor based on the If-Modified-Since header.
 * Mimics browser caching behavior for cookieless tracking.
 * @param ifModifiedSince The value of the If-Modified-Since header.
 * @returns Object containing `newVisitor` boolean.
 */
function checkVisitorSession(ifModifiedSince: string | null): {
    newVisitor: boolean;
} {
    let newVisitor = true;

    if (ifModifiedSince) {
        // check today is a new day vs ifModifiedSince
        const today = new Date();
        const ifModifiedSinceDate = new Date(ifModifiedSince);
        if (
            today.getFullYear() === ifModifiedSinceDate.getFullYear() &&
            today.getMonth() === ifModifiedSinceDate.getMonth() &&
            today.getDate() === ifModifiedSinceDate.getDate()
        ) {
            // if ifModifiedSince is today, this is not a new visitor
            newVisitor = false;
        }
    }

    return { newVisitor };
}

/**
 * Handles cache-related headers (If-Modified-Since, Last-Modified) to determine
 * visitor status based on hit count for cookieless tracking.
 *
 * @param ifModifiedSince The value of the If-Modified-Since header from the request.
 * @returns An object containing:
 *  - `hits`: Number indicating the count of hits within the current session.
 *  - `nextLastModifiedDate`: The Date object to be set in the Last-Modified response header.
 */
export function handleCacheHeaders(ifModifiedSince: string | null): {
    hits: number;
    nextLastModifiedDate: Date;
} {
    const { newVisitor } = checkVisitorSession(ifModifiedSince);
    const nextLastModifiedDate = getNextLastModifiedDate(
        ifModifiedSince ? new Date(ifModifiedSince) : null,
    );

    // Calculate hits from the seconds component of the date
    // If it's a new day or first visit, hits will be 1
    // Otherwise, it's based on the seconds value, but capped at 3
    // 1 - first visit
    // 2 - anti bounce
    // 3 - regular page view (3+ hits)
    let hits = newVisitor ? 1 : nextLastModifiedDate.getSeconds();
    
    // Cap the hit count at 3 to avoid exposing exact hit counts publicly
    if (hits > 3) {
        hits = 3;
    }

    return {
        hits,
        nextLastModifiedDate,
    };
}

function extractParamsFromQueryString(requestUrl: string): {
    [key: string]: string;
} {
    const url = new URL(requestUrl);
    const queryString = url.search.slice(1).split("&");

    const params: { [key: string]: string } = {};

    queryString.forEach((item) => {
        const kv = item.split("=");
        if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]);
    });
    return params;
}

function getDeviceTypeFromDevice(device: IDevice): string {
    // see: https://github.com/faisalman/ua-parser-js/issues/182
    return device.type === undefined ? "desktop" : device.type;
}

export function collectRequestHandler(
    request: Request,
    env: Env,
    extra: Record<string, string> = {}, // extra request properties (i.e. Cloudflare properties)
) {
    const params = extractParamsFromQueryString(request.url);

    const siteId = params.sid;
    if (!siteId || siteId === "") {
        return new Response("Missing siteId", { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    const parsedUserAgent = new UAParser(userAgent);

    // Check if hits parameter is provided in the request
    // If it is, use it to derive visit and bounce values; otherwise, calculate them using the If-Modified-Since header
    let isVisit = false;
    let bounceValue = 0;
    let nextLastModifiedDate: Date | undefined;
    let hits = 0;

    if (params.hits !== undefined) {
        // Parse hits count
        hits = parseInt(params.hits, 10);
        if (isNaN(hits) || hits < 0) {
            hits = 0; // Default to 0 if invalid
        }
        
        // Cap the hit count at 3 to avoid exposing exact hit counts publicly
        // 1 - first visit
        // 2 - anti bounce
        // 3 - regular page view (3+ hits)
        if (hits > 3) {
            hits = 3;
        }

        // Derive visit and bounce values from hits
        isVisit = hits === 1; // First hit means it's a new visit

        // Determine bounce value based on hits:
        // - 1 hit: it's a bounce (1)
        // - 2 hits: it's an anti-bounce (-1)
        // - 3+ hits: it's a normal visit (0)
        if (hits === 1) {
            bounceValue = 1; // Bounce
        } else if (hits === 2) {
            bounceValue = -1; // Anti-bounce
        } else {
            bounceValue = 0; // Normal (3+ hits)
        }
    } else if (params.v !== undefined && params.b !== undefined) {
        // Legacy support for v and b parameters (for backward compatibility)
        isVisit = params.v === "1";

        // Parse bounce value - could be -1, 0, or 1
        bounceValue = parseInt(params.b, 10);
        if (isNaN(bounceValue) || bounceValue < -1 || bounceValue > 1) {
            bounceValue = isVisit ? 1 : 0; // Default: if new visit, it's a bounce
        }
    } else {
        // Fallback: if the client doesn't provide hits or v/b, use cache headers
        const ifModifiedSince = request.headers.get("if-modified-since");
        const cacheResult = handleCacheHeaders(ifModifiedSince);
        hits = cacheResult.hits;

        // Derive visit and bounce values from hits
        isVisit = hits === 1; // First hit means it's a new visit

        if (hits === 1) {
            bounceValue = 1; // Bounce
        } else if (hits === 2) {
            bounceValue = -1; // Anti-bounce
        } else {
            bounceValue = 0; // Normal (3+ hits)
        }

        nextLastModifiedDate = cacheResult.nextLastModifiedDate;
    }

    const browserVersion = maskBrowserVersion(
        parsedUserAgent.getBrowser().version,
    );

    const data: DataPoint = {
        siteId,
        host: params.h,
        path: params.p,
        referrer: params.r,
        newVisitor: isVisit ? 1 : 0,
        newSession: 0, // dead column
        bounce: bounceValue,
        // user agent stuff
        userAgent: userAgent,
        browserName: parsedUserAgent.getBrowser().name,
        browserVersion: browserVersion,
        deviceModel: parsedUserAgent.getDevice().model,
        deviceType: getDeviceTypeFromDevice(parsedUserAgent.getDevice()),
    };

    // NOTE: location is derived from Cloudflare-specific request properties
    // see: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    const country = extra?.country;
    if (typeof country === "string") {
        data.country = country;
    }

    writeDataPoint(env.WEB_COUNTER_AE, data);

    // encode 1x1 transparent gif
    const gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const gifData = atob(gif);
    const gifLength = gifData.length;
    const arrayBuffer = new ArrayBuffer(gifLength);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < gifLength; i++) {
        uintArray[i] = gifData.charCodeAt(i);
    }

    const headers: HeadersInit = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "image/gif",
        Expires: "Mon, 01 Jan 1990 00:00:00 GMT",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Tk: "N", // not tracking
    };

    if (nextLastModifiedDate) {
        headers["Last-Modified"] = nextLastModifiedDate.toUTCString();
    }

    return new Response(arrayBuffer, {
        headers,
        status: 200,
    });
}

interface DataPoint {
    // index
    siteId?: string;

    // blobs
    host?: string | undefined;
    userAgent?: string;
    path?: string;
    country?: string;
    referrer?: string;
    browserName?: string;
    browserVersion?: string;
    deviceModel?: string;
    deviceType?: string;

    // doubles
    newVisitor: number;
    newSession: number;
    bounce: number;
}

// NOTE: Cloudflare Analytics Engine has limits on total number of bytes, number of fields, etc.
// More here: https://developers.cloudflare.com/analytics/analytics-engine/get-started/#limits

export function writeDataPoint(
    analyticsEngine: AnalyticsEngineDataset,
    data: DataPoint,
) {
    const datapoint = {
        indexes: [data.siteId || ""], // Supply one index
        blobs: [
            data.host || "", // blob1
            data.userAgent || "", // blob2
            data.path || "", // blob3
            data.country || "", // blob4
            data.referrer || "", // blob5
            data.browserName || "", // blob6
            data.deviceModel || "", // blob7
            data.siteId || "", // blob8
            data.browserVersion || "", // blob9
            data.deviceType || "", // blob10
        ],
        doubles: [data.newVisitor || 0, data.newSession || 0, data.bounce],
    };

    if (!analyticsEngine) {
        // no-op
        console.log("Can't save datapoint: Analytics unavailable");
        console.dir(datapoint, { depth: null });
        return;
    }

    analyticsEngine.writeDataPoint(datapoint);
}
