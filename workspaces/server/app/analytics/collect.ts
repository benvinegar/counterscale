import { UAParser } from "ua-parser-js";

import type { RequestInit } from "@cloudflare/workers-types";

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

export function collectRequestHandler(request: Request, env: Env) {
    const params = extractParamsFromQueryString(request.url);

    const userAgent = request.headers.get("user-agent") || undefined;
    const parsedUserAgent = new UAParser(userAgent);

    parsedUserAgent.getBrowser().name;

    const ifModifiedSince = request.headers.get("if-modified-since");
    const { newVisitor } = checkVisitorSession(ifModifiedSince);
    const nextLastModifiedDate = getNextLastModifiedDate(
        ifModifiedSince ? new Date(ifModifiedSince) : null,
    );

    const data: DataPoint = {
        siteId: params.sid,
        host: params.h,
        path: params.p,
        referrer: params.r,
        newVisitor: newVisitor ? 1 : 0,
        newSession: 0, // dead column
        bounce: newVisitor ? 1 : getBounceValue(nextLastModifiedDate),
        // user agent stuff
        userAgent: userAgent,
        browserName: parsedUserAgent.getBrowser().name,
        deviceModel: parsedUserAgent.getDevice().model,
    };

    // NOTE: location is derived from Cloudflare-specific request properties
    // see: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    const country = (request as RequestInit).cf?.country;
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
    deviceModel?: string;

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
        ],
        doubles: [data.newVisitor || 0, data.newSession || 0, data.bounce],
    };

    if (!analyticsEngine) {
        // no-op
        console.log("Can't save datapoint: Analytics unavailable");
        return;
    }

    analyticsEngine.writeDataPoint(datapoint);
}
