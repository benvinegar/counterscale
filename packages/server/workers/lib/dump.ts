import { AnalyticsEngineAPI } from "~/analytics/query";
import type { AnalyticsCountResult } from "~/analytics/query";
import type { WriteStreamMinimal } from "@dsnp/parquetjs/dist/lib/util";
import parquet from "parquetjs";
import { WriteStream } from "node:fs";
import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";

// get
export async function extractAsParquet({ accountId, bearerToken }: any) {
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

    console.log("lol");

    const analyticsEngine = new AnalyticsEngineAPI(accountId, bearerToken);

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

    const buf = Buffer.alloc(512000); // 256kb in bytes
    const uint8array = new Uint8Array(buf);

    class Writer implements WriteStreamMinimal {
        // private writer: WritableStreamDefaultWriter<Uint8Array>;
        private _ended = false;
        public bytesWritten = 0;

        constructor() {}

        // @ts-expect-error fudging a stream
        async write(
            chunk: Buffer | string,
            callback?: (error?: Error | null) => void,
        ): Promise<boolean> {
            console.log(arguments);
            return new Promise(async (reject, resolve) => {
                try {
                    // write each item in chunk to uint8array according to offset (bytesWritten) and chunk length
                    const buf = Buffer.from(chunk);
                    for (let i = 0; i < buf.length; i++) {
                        const start: number = this.bytesWritten;
                        uint8array[start + i] = buf[i];
                    }

                    // await this.writer.write(Buffer.from(chunk));

                    this.bytesWritten += buf.length;

                    if (typeof callback === "function") {
                        callback();
                    }
                    resolve(true);
                } catch (error) {
                    if (typeof callback === "function") {
                        callback(error as Error);
                    }
                    reject(false);
                }
            });
        }

        close(cb?: (error?: Error) => void): WriteStream {
            if (this._ended) {
                throw new Error("Stream already ended");
            }
            this._ended = true;

            if (typeof cb === "function") {
                cb();
            }

            return this as unknown as WriteStream;
        }
    }
    const _writer = new Writer();

    // const _writer = writable.getWriter();
    const writer = await parquet.ParquetWriter.openStream(
        schema,
        _writer as unknown as WriteStream,
    );
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
            console.error("Error appending row:", err);
            throw err; // Re-throw to ensure the error is handled by the caller
        }
    }

    await writer.close();

    console.log(_writer.bytesWritten);
    const usedBuffer = new Uint8Array(
        uint8array.buffer,
        0,
        _writer.bytesWritten,
    );

    // // Write the buffer to a file
    writeFileSync("output.parquet", usedBuffer, "binary");

    return new Promise((resolve, reject) => {
        console.log("DONE");
        resolve(true);
    });
}
