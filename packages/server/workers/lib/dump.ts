import { AnalyticsEngineAPI } from "~/analytics/query";
import type { AnalyticsCountResult } from "~/analytics/query";
import parquet from "parquetjs";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID as string;
const CF_BEARER_TOKEN = process.env.CF_BEARER_TOKEN as string;

var schema = new parquet.ParquetSchema({
    timestamp: { type: "TIMESTAMP_MILLIS" },
    siteId: { type: "UTF8" },
    path: { type: "UTF8" },
    referrer: { type: "UTF8" },
    browserName: { type: "UTF8" },
    browserVersion: { type: "UTF8" },
    deviceModel: { type: "UTF8" },
    views: { type: "INT64" },
    visitors: { type: "INT64" },
    bounces: { type: "INT64" },
});
// get
export default async function dump() {
    const analyticsEngine = new AnalyticsEngineAPI(
        CF_ACCOUNT_ID,
        CF_BEARER_TOKEN,
    );

    let results: Map<string[], AnalyticsCountResult> | undefined = undefined;
    try {
        results = await analyticsEngine.getAllCountsByAllColumnsForAllSites(
            [
                "path",
                "referrer",
                "browserName",
                "browserVersion",
                "deviceModel",
            ],
            "90d",
            "UTC",
        );
    } catch (err) {
        console.error(err);
    }

    if (!results) {
        console.error("No results returned from analytics");
        return;
    }

    var writer = await parquet.ParquetWriter.openFile(
        schema,
        "timeseries.parquet",
    );

    // iterate through the results and write them to the parquet file
    for (const [keys, value] of results) {
        await writer.appendRow({
            timestamp: new Date(),
            siteId: keys[0],
            path: keys[1],
            referrer: keys[2],
            browserName: keys[3],
            browserVersion: keys[4],
            deviceModel: keys[5],
            views: value.views,
            visitors: value.visitors,
            bounces: value.bounces,
        });
    }
    await writer.close();
}
dump();
