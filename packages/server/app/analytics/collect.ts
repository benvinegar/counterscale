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

    // increment counter
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
 * visitor status (new visit) and bounce status for cookieless tracking.
 *
 * @param ifModifiedSince The value of the If-Modified-Since header from the request.
 * @returns An object containing:
 *  - `isVisit`: Boolean indicating if this is considered a new visit.
 *  - `isBounce`: Boolean indicating if this visit is considered a bounce.
 *  - `nextLastModifiedDate`: The Date object to be set in the Last-Modified response header.
 */
export function handleCacheHeaders(ifModifiedSince: string | null): {
    isVisit: boolean;
    isBounce: boolean;
    nextLastModifiedDate: Date;
} {
    const { newVisitor: isVisit } = checkVisitorSession(ifModifiedSince);
    const nextLastModifiedDate = getNextLastModifiedDate(
        ifModifiedSince ? new Date(ifModifiedSince) : null,
    );
    const bounceValue = getBounceValue(nextLastModifiedDate);
    const isBounce = isVisit || bounceValue === 1;

    return {
        isVisit,
        isBounce,
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

    // Check if v and b (visit and bounce) are provided in the request parameters
    // If they are, use them; otherwise, calculate them using the If-Modified-Since header
    let isVisit = false;
    let isBounce = false;
    let nextLastModifiedDate: Date;

    if (params.v !== undefined && params.b !== undefined) {
        // Use the values provided by the client
        isVisit = params.v === "1";
        isBounce = params.b === "1";
        
        // Still need to get the next last modified date for the response header
        const ifModifiedSince = request.headers.get("if-modified-since");
        nextLastModifiedDate = getNextLastModifiedDate(
            ifModifiedSince ? new Date(ifModifiedSince) : null
        );
    } else {
        // Calculate values using the If-Modified-Since header
        const ifModifiedSince = request.headers.get("if-modified-since");
        const cacheResult = handleCacheHeaders(ifModifiedSince);
        isVisit = cacheResult.isVisit;
        isBounce = cacheResult.isBounce;
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
        bounce: isBounce ? 1 : 0,
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

    return new Response(arrayBuffer, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "image/gif",
            Expires: "Mon, 01 Jan 1990 00:00:00 GMT",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Last-Modified": nextLastModifiedDate.toUTCString(),
            Tk: "N", // not tracking
        },
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
