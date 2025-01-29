import { AnalyticsEngineAPI } from "~/analytics/query";
import parquet from "parquetjs";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID as string;
const CF_BEARER_TOKEN = process.env.CF_BEARER_TOKEN as string;

var schema = new parquet.ParquetSchema({
    timestamp: { type: "TIMESTAMP_MILLIS" },
    column_name: { type: "UTF8" },
    column_value: { type: "UTF8" },
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

    let results;
    try {
        results = await analyticsEngine.getAllCountsByAllColumnsForAllSites(
            [
                "path",
                "referrer",
                "browserName",
                "browserVersion",
                "deviceModel",
            ],
            "7d",
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

    // iterate through the results and append as a row to the parquet file
    for (const value of results) {
        const [path, views, visitors] = value;
        await writer.appendRow({
            timestamp: new Date(),
            column_name: "path",
            column_value: path,
            views: views,
            visitors: visitors,
            bounces: 0,
        });
    }
    await writer.close();
}
dump();
