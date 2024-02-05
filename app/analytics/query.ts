import { ColumnMappingToType, ColumnMappings } from "./schema";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface AnalyticsQueryResultRow {
    [key: string]: any;
}
interface AnalyticsQueryResult<SelectionSet extends AnalyticsQueryResultRow> {
    meta: string;
    data: SelectionSet[];
    rows: number;
    rows_before_limit_at_least: number;
}

interface AnalyticsCountResult {
    views: number;
    visits: number;
    visitors: number;
}

/**
 * Convert a Date object to YY-MM-DD HH:MM:SS
 */
function formatDateString(d: Date) {
    function pad(n: number) {
        return n < 10 ? "0" + n : n;
    }
    const dash = "-";
    const colon = ":";
    return (
        d.getFullYear() +
        dash +
        pad(d.getMonth() + 1) +
        dash +
        pad(d.getDate()) +
        " " +
        pad(d.getHours()) +
        colon +
        pad(d.getMinutes()) +
        colon +
        pad(d.getSeconds())
    );
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
    intervalType: string,
    daysAgo: number,
    tz?: string,
): [Date, { [key: string]: number }] {
    if (!tz) {
        tz = "Etc/UTC";
    }

    let localDateTime = dayjs();
    let intervalMs = 0;

    // get start date in the past by subtracting interval * type
    if (intervalType === "DAY") {
        localDateTime = dayjs()
            .utc()
            .subtract(daysAgo, "day")
            .tz(tz)
            .startOf("day");

        // assumes interval is 24 hours
        intervalMs = 24 * 60 * 60 * 1000;
    } else if (intervalType === "HOUR") {
        localDateTime = dayjs().utc().subtract(daysAgo, "day").startOf("hour");

        // assumes interval is hourly
        intervalMs = 60 * 60 * 1000;
    }

    const startDateTime = localDateTime.toDate();

    const initialRows: { [key: string]: number } = {};

    for (let i = startDateTime.getTime(); i < Date.now(); i += intervalMs) {
        // get date as utc
        const rowDate = new Date(i);
        // convert to UTC
        const utcDateTime = new Date(
            rowDate.getTime() + rowDate.getTimezoneOffset() * 60_000,
        );

        const key = formatDateString(utcDateTime);
        initialRows[key] = 0;
    }

    return [startDateTime, initialRows];
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
        intervalType: string,
        sinceDays: number,
        tz?: string,
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
        const [startDateTime, initialRows] = generateEmptyRowsOverInterval(
            intervalType,
            sinceDays,
            tz,
        );

        // NOTE: when using toStartOfInterval, cannot group by other columns
        //       like double1 (isVisitor) or double2 (isSession/isVisit). This
        //       is just a limitation of Cloudflare Analytics Engine.
        //       -- but you can filter on them (using WHERE)
        const query = `
            SELECT SUM(_sample_interval) as count,

            /* interval start needs local timezone, e.g. 00:00 in America/New York means start of day in NYC */
            toStartOfInterval(timestamp, INTERVAL '${intervalCount}' ${intervalType}, '${tz}') as _bucket,

            /* format output date as UTC (otherwise will be users local TZ) */
            toDateTime(_bucket, 'Etc/UTC') as bucket

            FROM metricsDataset
            WHERE timestamp > toDateTime('${formatDateString(startDateTime)}')
                AND ${ColumnMappings.siteId} = '${siteId}'
            GROUP BY _bucket
            ORDER BY _bucket ASC`;

        type SelectionSet = {
            count: number;
            _bucket: string;
            bucket: string;
        };

        const queryResult = this.query(query);
        const returnPromise = new Promise<[string, number][]>(
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
                            const key = formatDateString(utcDateTime);
                            accum[key] = row["count"];
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

                    resolve(sortedRows);
                })(),
        );
        return returnPromise;
    }

    async getCounts(siteId: string, sinceDays: number) {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        const siteIdColumn = ColumnMappings["siteId"];

        const query = `
            SELECT SUM(_sample_interval) as count, 
                ${ColumnMappings.newVisitor} as isVisitor, 
                ${ColumnMappings.newSession} as isVisit
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY isVisitor, isVisit
            ORDER BY isVisitor, isVisit ASC`;

        type SelectionSet = {
            count: number;
            isVisitor: number;
            isVisit: number;
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
                        visits: 0,
                    };

                    // NOTE: note it's possible to get no results, or half results (i.e. a row where isVisit=1 but
                    //       no row where isVisit=0), so this code makes no assumption on number of results
                    responseData.data.forEach((row) => {
                        if (row.isVisit == 1) {
                            counts.visits += Number(row.count);
                        }
                        if (row.isVisitor == 1) {
                            counts.visitors += Number(row.count);
                        }
                        counts.views += Number(row.count);
                    });
                    resolve(counts);
                })(),
        );

        return returnPromise;
    }

    async getVisitorCountByColumn<T extends keyof typeof ColumnMappings>(
        siteId: string,
        column: T,
        sinceDays: number,
        limit?: number,
    ) {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        limit = limit || 10;

        const _column = ColumnMappings[column];
        const query = `
            SELECT ${_column}, SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
                AND ${ColumnMappings.newVisitor} = 1
                AND ${ColumnMappings.siteId} = '${siteId}'
            GROUP BY ${_column}
            ORDER BY count DESC
            LIMIT ${limit}`;

        type SelectionSet = {
            count: number;
        } & Record<
            (typeof ColumnMappings)[T],
            ColumnMappingToType<(typeof ColumnMappings)[T]>
        >;

        const queryResult = this.query(query);
        const returnPromise = new Promise<
            [ColumnMappingToType<typeof _column> | "(none)", number][]
        >((resolve, reject) =>
            (async () => {
                const response = await queryResult;

                if (!response.ok) {
                    reject(response.statusText);
                }

                const responseData =
                    (await response.json()) as AnalyticsQueryResult<SelectionSet>;
                resolve(
                    responseData.data.map((row) => {
                        const key =
                            row[_column] === "" ? "(none)" : row[_column];
                        return [key, row["count"]] as const;
                    }),
                );
            })(),
        );
        return returnPromise;
    }

    async getCountByUserAgent(siteId: string, sinceDays: number) {
        return this.getVisitorCountByColumn(siteId, "userAgent", sinceDays);
    }

    async getCountByCountry(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, "country", sinceDays);
    }

    async getCountByReferrer(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, "referrer", sinceDays);
    }

    async getCountByPath(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, "path", sinceDays);
    }

    async getCountByBrowser(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, "browserName", sinceDays);
    }

    async getCountByDevice(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, "deviceModel", sinceDays);
    }

    async getSitesOrderedByHits(sinceDays: number, limit?: number) {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        limit = limit || 10;

        const query = `
            SELECT SUM(_sample_interval) as count, 
                ${ColumnMappings.siteId} as siteId
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
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
}
