export function collectRequestHandler(request: Request, env: Environment) {
    const params: any = {};
    const url = new URL(request.url)
    const queryString = url.search.slice(1).split('&')

    queryString.forEach(item => {
        const kv = item.split('=')
        if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1])
    });

    const data = {
        host: params.h,
        path: params.p,
        referrer: params.r,
        userAgent: request.headers.get('user-agent'),
        country: (request as any).cf?.country
    }

    processLogEntry(env.TALLYHO, data);

    return new Response("OK", { status: 200 });
}

export function processLogEntry(analyticsEngine: CFAnalyticsEngine, data: any) {
    const datapoint = {
        indexes: [data.ClientRequestHost || ""], // Supply one index
        blobs: [
            data.host || "",
            data.userAgent || "",
            data.path || "",
            data.country || "",
            data.referrer || "",
            // data.RayID || "",
            // data.ClientIP || "",
            // data.ClientRequestMethod || "",
            // data.ClientRequestURI || "",
        ],
        doubles: [
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