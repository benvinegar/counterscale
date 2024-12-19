import { ColumnMappingToType, ColumnMappings } from "./schema";

import { SearchFilters } from "~/lib/types";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
interface AnalyticsQueryResult<
    SelectionSet extends Record<string, string | number>,
> {
    meta: string;
    data: SelectionSet[];
    rows: number;
    rows_before_limit_at_least: number;
}

interface AnalyticsCountResult {
    views: number;
    visitors: number;
    bounces: number;
}

/** Given an AnalyticsCountResult object, and an object representing a row returned from
 *  CF Analytics Engine w/ counts grouped by isVisitor, accumulate view,
 *  visit, and visitor counts.
 */
function accumulateCountsFromRowResult(
    counts: AnalyticsCountResult,
    row: {
        count: number;
        isVisitor: number;
        isBounce: number;
    },
) {
    if (row.isVisitor == 1) {
        counts.visitors += Number(row.count);
    }
    if (row.isBounce && row.isBounce != 0) {
        // bounce is either 1 or -1
        counts.bounces += Number(row.count) * row.isBounce;
    }
    counts.views += Number(row.count);
}

export function intervalToSql(interval: string, tz?: string) {
    let startIntervalSql = "";
    let endIntervalSql = "";
    switch (interval) {
        case "today":
            // example: toDateTime('2024-01-07 00:00:00', 'America/New_York')
            startIntervalSql = `toDateTime('${dayjs().tz(tz).startOf("day").utc().format("YYYY-MM-DD HH:mm:ss")}')`;
            endIntervalSql = "NOW()";
            break;
        case "yesterday":
            startIntervalSql = `toDateTime('${dayjs().tz(tz).startOf("day").utc().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss")}')`;
            endIntervalSql = `toDateTime('${dayjs().tz(tz).startOf("day").utc().format("YYYY-MM-DD HH:mm:ss")}')`;
            break;
        case "1d":
        case "7d":
        case "30d":
        case "90d":
            startIntervalSql = `NOW() - INTERVAL '${interval.split("d")[0]}' DAY`;
            endIntervalSql = "NOW()";
            break;
        default:
            startIntervalSql = `NOW() - INTERVAL '1' DAY`;
            endIntervalSql = "NOW()";
    }
    return { startIntervalSql, endIntervalSql };
}

/**
 * returns an object with keys of the form "YYYY-MM-DD HH:00:00" and values of 0
 * example:
 *   {
 *      "2021-01-01 00:00:00": 0,
 *      "2021-01-01 02:00:00": 0,
 *      "2021-01-01 04:00:00": 0,
 *      ...
 *   }
 *
 * */
function generateEmptyRowsOverInterval(
    intervalType: "DAY" | "HOUR",
    startDateTime: Date,
    endDateTime: Date,
    tz?: string,
): { [key: string]: AnalyticsCountResult } {
    if (!tz) {
        tz = "Etc/UTC";
    }

    const initialRows: { [key: string]: AnalyticsCountResult } = {};

    while (startDateTime.getTime() < endDateTime.getTime()) {
        const key = dayjs(startDateTime).utc().format("YYYY-MM-DD HH:mm:ss");
        initialRows[key] = {
            views: 0,
            visitors: 0,
            bounces: 0,
        };

        if (intervalType === "DAY") {
            // WARNING: Daylight savings hack. Cloudflare Workers uses a different Date
            //          implementation than Node 20.x, which doesn't seem to respect DST
            //          boundaries the same way(see: https://github.com/benvinegar/counterscale/issues/108).
            //
            //          To work around this, we add 25 hours to the start date/time, then get the
            //          start of the day, then convert it back to a Date object. This works in both
            //          Node 20.x and Cloudflare Workers environments.
            startDateTime = dayjs(startDateTime)
                .add(25, "hours")
                .tz(tz)
                .startOf("day")
                .toDate();
        } else if (intervalType === "HOUR") {
            startDateTime = dayjs(startDateTime).add(1, "hour").toDate();
        } else {
            throw new Error("Invalid interval type");
        }
    }

    return initialRows;
}

function filtersToSql(filters: SearchFilters) {
    const supportedFilters: Array<keyof SearchFilters> = [
        "path",
        "referrer",
        "browserName",
        "country",
        "deviceModel",
    ];

    let filterStr = "";
    supportedFilters.forEach((filter) => {
        if (Object.hasOwnProperty.call(filters, filter)) {
            filterStr += `AND ${ColumnMappings[filter]} = '${filters[filter]}'`;
        }
    });
    return filterStr;
}

/**
 * NOTE: There are a bunch of "unsafe" SQL-like queries in here, in the sense that
 *       they are unparameterized raw SQL-like strings sent over HTTP. Cloudflare Analytics Engine
 *       does NOT support parameterized queries, nor is there an easy SQL-escaping
 *       library floating around for NodeJS (without using a database client library).
 *       Since Cloudflare Analytics Engine SQL API only supports SELECT, I think it's okay to
 *       leave it like this for now (i.e. an attacker cannot DROP TABLES or mutate data).
 *
 *       See: https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/
 */

export class AnalyticsEngineAPI {
    cfApiToken: string;
    cfAccountId: string;
    defaultHeaders: {
        "content-type": string;
        "X-Source": string;
        Authorization: string;
    };
    defaultUrl: string;

    constructor(cfAccountId: string, cfApiToken: string) {
        this.cfAccountId = cfAccountId;
        this.cfApiToken = cfApiToken;

        this.defaultUrl = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/analytics_engine/sql`;
        this.defaultHeaders = {
            "content-type": "application/json;charset=UTF-8",
            "X-Source": "Cloudflare-Workers",
            Authorization: `Bearer ${this.cfApiToken}`,
        };
    }

    async query(query: string) {
        return fetch(this.defaultUrl, {
            method: "POST",
            body: query,
            headers: this.defaultHeaders,
        });
    }

    async getViewsGroupedByInterval(
        siteId: string,
        intervalType: "DAY" | "HOUR",
        startDateTime: Date, // start date/time in local timezone
        endDateTime: Date, // end date/time in local timezone
        tz?: string, // local timezone
        filters: SearchFilters = {},
    ) {
        let intervalCount = 1;

        // keeping this code here once we start allowing bigger intervals (e.g. intervals of 2 hours)
        switch (intervalType) {
            case "DAY":
            case "HOUR":
                intervalCount = 1;
                break;
        }

        // note interval count hard-coded to hours at the moment
        const initialRows = generateEmptyRowsOverInterval(
            intervalType,
            startDateTime,
            endDateTime,
            tz,
        );

        const filterStr = filtersToSql(filters);

        // NOTE: when using toStartOfInterval, cannot group by other columns like double1 (isVisitor).
        //       This is just a limitation of Cloudflare Analytics Engine.
        //       -- but you can filter on them (using WHERE)

        // NOTE 2: Since CF AE doesn't support COALESCE, this query will not return
        //         rows (dates) where no hits were recorded -- which is why we need
        //         to generate empty buckets in JS (generateEmptyRowsOverInterval)
        //         and merge them with the results.

        const localStartTime = dayjs(startDateTime).tz(tz).utc();
        const localEndTime = dayjs(endDateTime).tz(tz).utc();

        const query = `
            SELECT SUM(_sample_interval) as count,

            /* interval start needs local timezone, e.g. 00:00 in America/New York means start of day in NYC */
            toStartOfInterval(timestamp, INTERVAL '${intervalCount}' ${intervalType}, '${tz}') as _bucket,
            ${ColumnMappings.newVisitor} as isVisitor,
            ${ColumnMappings.bounce} as isBounce,

            /* output as UTC */
            toDateTime(_bucket, 'Etc/UTC') as bucket
            FROM metricsDataset
            WHERE timestamp >= toDateTime('${localStartTime.format("YYYY-MM-DD HH:mm:ss")}')
								AND timestamp < toDateTime('${localEndTime.format("YYYY-MM-DD HH:mm:ss")}')
                AND ${ColumnMappings.siteId} = '${siteId}'
                ${filterStr}
            GROUP BY _bucket, isVisitor, isBounce
            ORDER BY _bucket ASC`;

        type SelectionSet = {
            count: number;
            bucket: string;
            isVisitor: number;
            isBounce: number;
        };

        const queryResult = this.query(query);
        const returnPromise = new Promise<[string, AnalyticsCountResult][]>(
            (resolve, reject) =>
                (async () => {
                    const response = await queryResult;

                    if (!response.ok) {
                        reject(response.statusText);
                    }

                    const responseData =
                        (await response.json()) as AnalyticsQueryResult<SelectionSet>;

                    // note this query will return sparse data (i.e. only rows where count > 0)
                    // merge returnedRows with initial rows to fill in any gaps
                    const rowsByDateTime = responseData.data.reduce(
                        (accum, row) => {
                            const utcDateTime = new Date(row["bucket"]);
                            const key = dayjs(utcDateTime).format(
                                "YYYY-MM-DD HH:mm:ss",
                            );
                            if (!Object.hasOwn(accum, key)) {
                                accum[key] = {
                                    views: 0,
                                    visitors: 0,
                                    bounces: 0,
                                };
                            }
                            accumulateCountsFromRowResult(accum[key], row);

                            return accum;
                        },
                        initialRows,
                    );

                    // return as sorted array of tuples (i.e. [datetime, count])
                    const sortedRows = Object.entries(rowsByDateTime).sort(
                        (a, b) => {
                            if (a[0] < b[0]) return -1;
                            else if (a[0] > b[0]) return 1;
                            else return 0;
                        },
                    );

                    // Fix negative bounce values coming from sparse values.
                    //
                    // If data is sparse, it's possible to have a bucket where a negative bounce value. This is because
                    // the initial "bounce" occurred in an earlier bucket. We need to go "back in time" and amend
                    // that bucket. Otherwise chart will show -100% bounce rate which makes no sense.
                    // (NOTE: The buckets must be sorted)
                    for (let i = 1; i < sortedRows.length; i++) {
                        const current = sortedRows[i][1];
                        // if the current value of bounces is negative, find the last non-zero bucket and decrement
                        if (current.bounces < 0) {
                            for (let j = i - 1; j >= 0; j--) {
                                const prev = sortedRows[j][1];
                                if (prev.bounces > 0) {
                                    prev.bounces += current.bounces;
                                    current.bounces = 0; // zero-out current bucket
                                    break;
                                }
                            }
                        }
                    }

                    resolve(sortedRows);
                })(),
        );
        return returnPromise;
    }

    async getCounts(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
    ) {
        // defaults to 1 day if not specified
        const siteIdColumn = ColumnMappings["siteId"];

        const { startIntervalSql, endIntervalSql } = intervalToSql(
            interval,
            tz,
        );

        const filterStr = filtersToSql(filters);

        const query = `
            SELECT SUM(_sample_interval) as count,
                ${ColumnMappings.newVisitor} as isVisitor,
                ${ColumnMappings.bounce} as isBounce
            FROM metricsDataset
            WHERE timestamp >= ${startIntervalSql} AND timestamp < ${endIntervalSql}
                ${filterStr}
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY isVisitor, isBounce
            ORDER BY isVisitor, isBounce ASC`;

        type SelectionSet = {
            count: number;
            isVisitor: number;
            isBounce: number;
        };

        const queryResult = this.query(query);

        const returnPromise = new Promise<AnalyticsCountResult>(
            (resolve, reject) =>
                (async () => {
                    const response = await queryResult;

                    if (!response.ok) {
                        reject(response.statusText);
                    }

                    const responseData =
                        (await response.json()) as AnalyticsQueryResult<SelectionSet>;

                    const counts: AnalyticsCountResult = {
                        views: 0,
                        visitors: 0,
                        bounces: 0,
                    };

                    // NOTE: note it's possible to get no results, or half results (i.e. a row where isVisit=1 but
                    //       no row where isVisit=0), so this code makes no assumption on number of results
                    responseData.data.forEach((row) => {
                        accumulateCountsFromRowResult(counts, row);
                    });
                    resolve(counts);
                })(),
        );

        return returnPromise;
    }

    async getVisitorCountByColumn<T extends keyof typeof ColumnMappings>(
        siteId: string,
        column: T,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
        limit: number = 10,
    ) {
        const { startIntervalSql, endIntervalSql } = intervalToSql(
            interval,
            tz,
        );

        const filterStr = filtersToSql(filters);

        const _column = ColumnMappings[column];
        const query = `
            SELECT ${_column}, SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp >= ${startIntervalSql} AND timestamp < ${endIntervalSql}
                AND ${ColumnMappings.newVisitor} = 1
                AND ${ColumnMappings.siteId} = '${siteId}'
                ${filterStr}
            GROUP BY ${_column}
            ORDER BY count DESC
            LIMIT ${limit * page}`;

        type SelectionSet = {
            count: number;
        } & Record<
            (typeof ColumnMappings)[T],
            ColumnMappingToType<(typeof ColumnMappings)[T]>
        >;

        const queryResult = this.query(query);
        const returnPromise = new Promise<
            [ColumnMappingToType<typeof _column>, number][]
        >((resolve, reject) =>
            (async () => {
                const response = await queryResult;

                if (!response.ok) {
                    reject(response.statusText);
                }

                const responseData =
                    (await response.json()) as AnalyticsQueryResult<SelectionSet>;

                // since CF AE doesn't support OFFSET clauses, we select up to LIMIT and
                // then slice that into the individual requested page
                const pageData = responseData.data.slice(
                    limit * (page - 1),
                    limit * page,
                );

                resolve(
                    pageData.map((row) => {
                        const key = row[_column];
                        return [key, Number(row["count"])] as const;
                    }),
                );
            })(),
        );
        return returnPromise;
    }

    async getAllCountsByColumn<T extends keyof typeof ColumnMappings>(
        siteId: string,
        column: T,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
        limit: number = 10,
    ): Promise<Record<string, AnalyticsCountResult>> {
        const { startIntervalSql, endIntervalSql } = intervalToSql(
            interval,
            tz,
        );

        // first query by visitor count – this is to figure out the top N results
        // by visitor count first
        // NOTE: there's an await here; need to fix this or harms parallelism
        const visitorCountByColumn = await this.getVisitorCountByColumn(
            siteId,
            column,
            interval,
            tz,
            filters,
            page,
            limit,
        );

        // next, make a second query - this time for non-visitor hits - by filtering
        // on the keys returned by the first query.
        const keys = visitorCountByColumn.map(([key]) => key);

        let filterStr = filtersToSql(filters);
        const _column = ColumnMappings[column];

        if (keys.length > 0) {
            filterStr += ` AND ${_column} IN (${keys.map((key) => `'${key}'`).join(", ")})`;
        }

        const query = `
            SELECT ${_column},
                ${ColumnMappings.newVisitor} as isVisitor,
                SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp >= ${startIntervalSql} AND timestamp < ${endIntervalSql}
                AND ${ColumnMappings.newVisitor} = 0
                AND ${ColumnMappings.siteId} = '${siteId}'
                ${filterStr}
            GROUP BY ${_column}, ${ColumnMappings.newVisitor}
            ORDER BY count DESC
            LIMIT ${limit * page}`;

        type SelectionSet = {
            count: number;
            isVisitor: number;
            isBounce: number;
        } & Record<
            (typeof ColumnMappings)[T],
            ColumnMappingToType<(typeof ColumnMappings)[T]>
        >;

        const queryResult = this.query(query);
        const returnPromise = new Promise<Record<string, AnalyticsCountResult>>(
            (resolve, reject) =>
                (async () => {
                    const response = await queryResult;

                    if (!response.ok) {
                        reject(response.statusText);
                    }

                    const responseData =
                        (await response.json()) as AnalyticsQueryResult<SelectionSet>;

                    // since CF AE doesn't support OFFSET clauses, we select up to LIMIT and
                    // then slice that into the individual requested page
                    const pageData = responseData.data.slice(
                        limit * (page - 1),
                        limit * page,
                    );

                    // remap visitor counts into SelectionSet objects, then insert into
                    // the query results (pageData)
                    visitorCountByColumn.forEach(([key, value]) => {
                        pageData.push({
                            [_column]: key,
                            count: value,
                            isVisitor: 1,
                        } as SelectionSet);
                    });

                    const result = pageData.reduce(
                        (acc, row) => {
                            const key = row[_column] as string;
                            if (!Object.hasOwn(acc, key)) {
                                acc[key] = {
                                    views: 0,
                                    visitors: 0,
                                    bounces: 0,
                                } as AnalyticsCountResult;
                            }

                            accumulateCountsFromRowResult(acc[key], row);
                            return acc;
                        },
                        {} as Record<string, AnalyticsCountResult>,
                    );

                    resolve(result);
                })(),
        );
        return returnPromise;
    }

    async getCountByPath(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
    ): Promise<[path: string, visitors: number, views: number][]> {
        const allCountsResultPromise = this.getAllCountsByColumn(
            siteId,
            "path",
            interval,
            tz,
            filters,
            page,
        );

        return allCountsResultPromise.then((allCountsResult) => {
            const result: [string, number, number][] = [];
            for (const [key] of Object.entries(allCountsResult)) {
                const record = allCountsResult[key];
                result.push([key, record.visitors, record.views]);
            }
            // sort by visitors
            return result.sort((a, b) => b[1] - a[1]);
        });
    }

    async getCountByCountry(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
    ): Promise<[country: string, visitors: number][]> {
        return this.getVisitorCountByColumn(
            siteId,
            "country",
            interval,
            tz,
            filters,
            page,
        );
    }

    async getCountByReferrer(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
    ): Promise<[referrer: string, visitors: number, views: number][]> {
        const allCountsResultPromise = this.getAllCountsByColumn(
            siteId,
            "referrer",
            interval,
            tz,
            filters,
            page,
        );

        return allCountsResultPromise.then((allCountsResult) => {
            const result: [string, number, number][] = [];
            for (const [key] of Object.entries(allCountsResult)) {
                const record = allCountsResult[key];
                result.push([key, record.visitors, record.views]);
            }
            // sort by visitors
            return result.sort((a, b) => b[1] - a[1]);
        });
    }

    async getCountByBrowser(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
    ): Promise<[browser: string, visitors: number][]> {
        return this.getVisitorCountByColumn(
            siteId,
            "browserName",
            interval,
            tz,
            filters,
            page,
        );
    }

    async getCountByDevice(
        siteId: string,
        interval: string,
        tz?: string,
        filters: SearchFilters = {},
        page: number = 1,
    ): Promise<[deviceModel: string, visitors: number][]> {
        return this.getVisitorCountByColumn(
            siteId,
            "deviceModel",
            interval,
            tz,
            filters,
            page,
        );
    }

    async getSitesOrderedByHits(interval: string, limit?: number) {
        // defaults to 1 day if not specified

        limit = limit || 10;

        const { startIntervalSql, endIntervalSql } = intervalToSql(interval);

        const query = `
            SELECT SUM(_sample_interval) as count,
                ${ColumnMappings.siteId} as siteId
            FROM metricsDataset
            WHERE timestamp >= ${startIntervalSql} AND timestamp < ${endIntervalSql}
            GROUP BY siteId
            ORDER BY count DESC
            LIMIT ${limit}
        `;

        type SelectionSet = {
            count: number;
            siteId: string;
        };

        const queryResult = this.query(query);
        const returnPromise = new Promise<[string, number][]>(
            (resolve, reject) =>
                (async () => {
                    const response = await queryResult;

                    if (!response.ok) {
                        reject(response.statusText);
                        return;
                    }

                    const responseData =
                        (await response.json()) as AnalyticsQueryResult<SelectionSet>;
                    const result = responseData.data.reduce(
                        (acc, cur) => {
                            acc.push([cur["siteId"], cur["count"]]);
                            return acc;
                        },
                        [] as [string, number][],
                    );

                    resolve(result);
                })(),
        );
        return returnPromise;
    }

    async getEarliestEvents(siteId: string): Promise<{
        earliestEvent: Date | null;
        earliestBounce: Date | null;
    }> {
        const query = `
            SELECT 
                MIN(timestamp) as earliestEvent,
                ${ColumnMappings.bounce} as isBounce
            FROM metricsDataset
            WHERE ${ColumnMappings.siteId} = '${siteId}'
            GROUP by isBounce
        `;

        type SelectionSet = {
            earliestEvent: string;
            isBounce: number;
        };
        const queryResult = this.query(query);
        const returnPromise = new Promise<{
            earliestEvent: Date | null;
            earliestBounce: Date | null;
        }>((resolve, reject) => {
            (async () => {
                const response = await queryResult;

                if (!response.ok) {
                    reject(response.statusText);
                    return;
                }

                const responseData =
                    (await response.json()) as AnalyticsQueryResult<SelectionSet>;

                const data = responseData.data;

                const earliestEvent = data.find(
                    (row) => row["isBounce"] === 0,
                )?.earliestEvent;

                const earliestBounce = data.find(
                    (row) => row["isBounce"] === 1,
                )?.earliestEvent;

                resolve({
                    earliestEvent: earliestEvent
                        ? new Date(earliestEvent)
                        : null,
                    earliestBounce: earliestBounce
                        ? new Date(earliestBounce)
                        : null,
                });
            })();
        });

        return returnPromise;
    }
}
