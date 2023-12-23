export function processLogEntry(ANALYTICS, data) {
    const datapoint = {
        indexes: [data.ClientRequestHost || ""], // Supply one index
        blobs: [
            data.referer || "",
            data['user-agent'] || "",
            // Supply a maximum of 20 blobs (max total data size 5120 bytes)
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
    // console.log(datapoint);

    if (!ANALYTICS) {
        console.log("Can't save datapoint: Analytics unavailable");
        // console.dir(datapoint);
        return;
    }

    ANALYTICS.writeDataPoint(datapoint);
}