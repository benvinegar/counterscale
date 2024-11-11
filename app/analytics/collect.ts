import { UAParser } from "ua-parser-js";

import type { RequestInit } from "@cloudflare/workers-types";

function checkVisitorSession(ifModifiedSince: string | null): {
    newVisitor: boolean;
    newSession: boolean;
} {
    let newVisitor = true;
    let newSession = true;

    const minutesUntilSessionResets = 30;
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

        // check ifModifiedSince is less than 30 mins ago
        if (
            Date.now() - new Date(ifModifiedSince).getTime() <
            minutesUntilSessionResets * 60 * 1000
        ) {
            // this is a continuation of the same session
            newSession = false;
        }
    }

    return { newVisitor, newSession };
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
    switch (request.method) {
        case "GET": {
            const params = extractParamsFromQueryString(request.url);

            const userAgent = request.headers.get("user-agent") || undefined;
            const parsedUserAgent = new UAParser(userAgent);

            parsedUserAgent.getBrowser().name;

            const { newVisitor, newSession } = checkVisitorSession(
                request.headers.get("if-modified-since"),
            );

            const data: DataPoint = {
                siteId: params.sid,
                host: params.h,
                path: params.p,
                referrer: params.r,
                newVisitor: newVisitor ? 1 : 0,
                newSession: newSession ? 1 : 0,
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
            const gif =
                "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
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
                    "Last-Modified": new Date().toUTCString(),
                    Tk: "N", // not tracking
                },
                status: 200,
            });
        }
        case "POST": {
            const body: PostRequestBody =
                request.json() as unknown as PostRequestBody;
            if (!body) {
                return new Response("Invalid request", { status: 400 });
            }

            if (
                !body.siteId ||
                !body.host ||
                !body.userAgent ||
                !body.path ||
                !body.country ||
                !body.referrer ||
                !body.browserName ||
                !body.deviceModel ||
                !body.ifModifiedSince
            ) {
                return new Response("Missing required fields", { status: 400 });
            }

            const userAgent = body.userAgent || undefined;
            const parsedUserAgent = new UAParser(userAgent);

            parsedUserAgent.getBrowser().name;

            const { newVisitor, newSession } = checkVisitorSession(
                body.ifModifiedSince,
            );

            const data: DataPoint = {
                siteId: body.siteId,
                host: body.host,
                path: body.path,
                country: body.country,
                referrer: body.referrer,
                newVisitor: newVisitor ? 1 : 0,
                newSession: newSession ? 1 : 0,
                // user agent stuff
                userAgent: userAgent,
                browserName:
                    body.browserName || parsedUserAgent.getBrowser().name,
                deviceModel:
                    body.deviceModel || parsedUserAgent.getDevice().model,
            };

            writeDataPoint(env.WEB_COUNTER_AE, data);

            return new Response("OK", { status: 200 });
        }
        default: {
            return new Response("Method not allowed", {
                status: 405,
                statusText: "Method not allowed",
            });
        }
    }
}

interface PostRequestBody {
    siteId: string;
    host: string;
    userAgent: string;
    path: string;
    country: string;
    referrer: string;
    browserName: string;
    deviceModel: string;
    ifModifiedSince: string;
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
        doubles: [data.newVisitor || 0, data.newSession || 0],
    };

    if (!analyticsEngine) {
        // no-op
        console.log("Can't save datapoint: Analytics unavailable");
        return;
    }

    analyticsEngine.writeDataPoint(datapoint);
}
