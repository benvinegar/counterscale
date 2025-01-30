import { AnalyticsEngineAPI } from "~/analytics/query";
import type { AnalyticsCountResult } from "~/analytics/query";
import type { WriteStreamMinimal } from "@dsnp/parquetjs/dist/lib/util";
import parquet from "@dsnp/parquetjs";
import { WriteStream } from "node:fs";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID as string;
const CF_BEARER_TOKEN = process.env.CF_BEARER_TOKEN as string;

var schema = new parquet.ParquetSchema({
    date: { type: "DATE" },
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

    const startDate = new Date("2024-01-28T00:00:00.000Z");
    // endDate is startDate's end of day
    const endDate = new Date("2025-01-28T23:59:59.000Z");

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
            startDate,
            endDate,
            "UTC",
        );
    } catch (err) {
        console.error(err);
    }

    if (!results) {
        console.error("No results returned from analytics");
        return;
    }

    const { readable, writable } = new TransformStream();

    class Writer implements WriteStreamMinimal {
        private writer: WritableStreamDefaultWriter<Uint8Array>;
        private _ended = false;
        public bytesWritten = 0;

        constructor(writer: WritableStreamDefaultWriter<Uint8Array>) {
            this.writer = writer;
        }

        write(
            chunk: Buffer | string,
            encoding?: BufferEncoding | ((error?: Error | null) => void),
            callback?: (error?: Error | null) => void,
        ): boolean {
            this.writer.write(Buffer.from(chunk));
            this.bytesWritten += chunk.length;
            console.log(chunk);
            if (typeof callback === "function") {
                callback();
            }
            return true;
        }

        // @ts-expect-error fudging a stream
        end(cb?: () => void): WriteStream {
            if (this._ended) {
                throw new Error("Stream already ended");
            }
            this.writer.close().then(() => {
                if (cb) cb();
                this._ended = true;
            });
        }
    }
    const _writer = new Writer(writable.getWriter());
    const writer = await parquet.ParquetWriter.openStream(schema, _writer);

    // iterate through the results and write them to the parquet file
    for (const [keys, value] of results) {
        try {
            await writer.appendRow({
                date: new Date(keys[0]),
                siteId: keys[1],
                path: keys[2],
                referrer: keys[3],
                browserName: keys[4],
                browserVersion: keys[5],
                deviceModel: keys[6],
                views: value.views,
                visitors: value.visitors,
                bounces: value.bounces,
            });
        } catch (err) {
            console.error(err);
        }
    }
    await writer.close();
}
dump();
