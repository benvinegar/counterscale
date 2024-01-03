import { UAParser } from 'ua-parser-js';

export function collectRequestHandler(request: Request, env: Environment) {
    const params: any = {};
    const url = new URL(request.url)
    const queryString = url.search.slice(1).split('&')

    queryString.forEach(item => {
        const kv = item.split('=')
        if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1])
    });

    const userAgent = request.headers.get('user-agent') || undefined;
    const parsedUserAgent = new UAParser(userAgent);

    parsedUserAgent.getBrowser().name;

    const ifModifiedSince = request.headers.get('if-modified-since');
    let newVisitor = 1;

    const minutesUntilVisitResets = 30;
    if (ifModifiedSince && (Date.now() - new Date(ifModifiedSince).getTime()) < minutesUntilVisitResets * 60 * 1000) {
        // if ifModifiedSince occurred less than 30 mins ago, this is a 
        // continuation of the same session/visit (ergo not a new visitor)
        newVisitor = 0;
    }

    const data = {
        siteId: params.sid,
        host: params.h,
        path: params.p,
        referrer: params.r,
        newVisitor: newVisitor,
        newSession: Number(params.ns),
        // user agent stuff
        userAgent: userAgent,
        browserName: parsedUserAgent.getBrowser().name,
        deviceModel: parsedUserAgent.getDevice().model,
        // location
        country: (request as any).cf?.country,
    }

    console.log(data);
    processLogEntry(env.WEB_COUNTER_AE, data);

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
            "Expires": "Mon, 01 Jan 1990 00:00:00 GMT",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Last-Modified": new Date(),
            "Tk": "N", // not tracking
        },
        status: 200
    });
}

export function processLogEntry(analyticsEngine: CFAnalyticsEngine, data: any) {
    const datapoint = {
        indexes: [data.ClientRequestHost || ""], // Supply one index
        blobs: [
            data.host || "", // blob1
            data.userAgent || "", // blob2
            data.path || "", // blob3
            data.country || "", // blob4
            data.referrer || "", // blob5
            data.browserName || "", // blob6
            data.deviceModel || "", // blob7
            data.siteId || "", // blob8
            // data.RayID || "",
            // data.ClientIP || "",
            // data.ClientRequestMethod || "",
            // data.ClientRequestURI || "",
        ],
        doubles: [
            data.newVisitor || 0,
            data.newSession || 0,
            // // Supply a maximum of 20 doubles
            // data.EdgeStartTimestamp || 0,
            // data.EdgeEndTimestamp || 0,
            // data.EdgeResponseStatus || 0,
            // data.EdgeResponseBytes || 0,
        ],
    }

    if (!analyticsEngine) {
        console.log("Can't save datapoint: Analytics unavailable");
        return;
    }

    analyticsEngine.writeDataPoint(datapoint);
}