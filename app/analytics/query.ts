import { ColumnMappingToType, ColumnMappings } from "./schema";

import dayjs, { ManipulateType } from "dayjs";
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
    visits: number;
    visitors: number;
}

/** Given an AnalyticsCountResult object, and an object representing a row returned from
 *  CF Analytics Engine w/ counts grouped by isVisitor and isVisit, accumulate view,
 *  visit, and visitor counts.
 */
function accumulateCountsFromRowResult(
    counts: AnalyticsCountResult,
    row: {
        count: number;
        isVisitor: number;
        isVisit: number;
    },
) {
    if (row.isVisit == 1) {
        counts.visits += Number(row.count);
    }
    if (row.isVisitor == 1) {
        counts.visitors += Number(row.count);
    }
    counts.views += Number(row.count);
}

export function intervalToSql(interval: string, tz?: string) {
    let intervalSql = "";
    switch (interval) {
        case "today":
            // example: toDateTime('2024-01-07 00:00:00', 'America/New_York')
            intervalSql = `toDateTime('${dayjs().tz(tz).startOf("day").utc().format("YYYY-MM-DD HH:mm:ss")}')`;
            break;
        case "1d":
        case "7d":
        case "30d":
        case "90d":
            intervalSql = `NOW() - INTERVAL '${interval.split("d")[0]}' DAY`;
            break;
        default:
            intervalSql = `NOW() - INTERVAL '1' DAY`;
    }
    return intervalSql;
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
    tz?: string,
): { [key: string]: number } {
    if (!tz) {
        tz = "Etc/UTC";
    }

    const initialRows: { [key: string]: number } = {};

    // NOTE: Need to explicitly use dayjs to increment by 1 day/1 hour/etc, because
    //       dayjs will respect and adjust for daylight savings time boundaries.
    //
    //       For example, in 2024, Daylight Savings Time began on 3/10/24 at 2:00 AM.
    //       In UTC, before the switch, America/New_York was 5 hours behind UTC (+5:00).
    //       But after the switch, it becomes 4 hours behind UTC (+4:00). Dayjs
    //       accounts for this difference.
    //
    //       There is no unit test affirming this behavior, because I could not figure
    //       out how to get vitest/mock dates to recreate DST changes.
    //       See: https://github.com/benvinegar/counterscale/pull/62

    while (startDateTime.getTime() < Date.now()) {
        const key = dayjs(startDateTime).utc().format("YYYY-MM-DD HH:mm:ss");
        initialRows[key] = 0;

        startDateTime = dayjs(startDateTime)
            // increment by either DAY or HOUR
            .add(1, intervalType.toLowerCase() as ManipulateType)
            .toDate();
    }

    return initialRows;
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
        tz?: string, // local timezone
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
            tz,
        );

        // NOTE: when using toStartOfInterval, cannot group by other columns
        //       like double1 (isVisitor) or double2 (isSession/isVisit). This
        //       is just a limitation of Cloudflare Analytics Engine.
        //       -- but you can filter on them (using WHERE)

        // NOTE 2: Since CF AE doesn't support COALESCE, this query will not return
        //         rows (dates) where no hits were recorded -- which is why we need
        //         to generate empty buckets in JS (generateEmptyRowsOverInterval)
        //         and merge them with the results.

        const localStartTime = dayjs(startDateTime).tz(tz).utc();

        const query = `
            SELECT SUM(_sample_interval) as count,

            /* interval start needs local timezone, e.g. 00:00 in America/New York means start of day in NYC */
            toStartOfInterval(timestamp, INTERVAL '${intervalCount}' ${intervalType}, '${tz}') as _bucket,

            /* output as UTC */
            toDateTime(_bucket, 'Etc/UTC') as bucket

            FROM metricsDataset
            WHERE timestamp > toDateTime('${localStartTime.format("YYYY-MM-DD HH:mm:ss")}')
                AND ${ColumnMappings.siteId} = '${siteId}'
            GROUP BY _bucket
            ORDER BY _bucket ASC`;

        type SelectionSet = {
            count: number;
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
                            const key = dayjs(utcDateTime).format(
                                "YYYY-MM-DD HH:mm:ss",
                            );
                            accum[key] = Number(row["count"]);
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

    async getCounts(siteId: string, interval: string, tz?: string) {
        // defaults to 1 day if not specified
        const siteIdColumn = ColumnMappings["siteId"];

        const intervalSql = intervalToSql(interval, tz);

        const query = `
            SELECT SUM(_sample_interval) as count,
                ${ColumnMappings.newVisitor} as isVisitor,
                ${ColumnMappings.newSession} as isVisit
            FROM metricsDataset
            WHERE timestamp > ${intervalSql}
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
        page: number = 1,
        limit: number = 10,
    ) {
        const intervalSql = intervalToSql(interval, tz);

        const _column = ColumnMappings[column];
        const query = `
            SELECT ${_column}, SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp > ${intervalSql}
                AND ${ColumnMappings.newVisitor} = 1
                AND ${ColumnMappings.siteId} = '${siteId}'
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
            [ColumnMappingToType<typeof _column> | "(none)", number][]
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
                        const key =
                            row[_column] === "" ? "(none)" : row[_column];
                        return [key, row["count"]] as const;
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
        page: number = 1,
        limit: number = 10,
    ) {
        const intervalSql = intervalToSql(interval, tz);

        const _column = ColumnMappings[column];
        const query = `
            SELECT ${_column},
                ${ColumnMappings.newVisitor} as isVisitor,
                ${ColumnMappings.newSession} as isVisit,
                SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp > ${intervalSql}
                AND ${ColumnMappings.siteId} = '${siteId}'
            GROUP BY ${_column}, ${ColumnMappings.newVisitor}, ${ColumnMappings.newSession}
            ORDER BY count DESC
            LIMIT ${limit * page}`;

        type SelectionSet = {
            readonly count: number;
            readonly isVisitor: number;
            readonly isVisit: number;
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

                    const result = pageData.reduce(
                        (acc, row) => {
                            const key =
                                row[_column] === ""
                                    ? "(none)"
                                    : (row[_column] as string);
                            if (!Object.hasOwn(acc, key)) {
                                acc[key] = {
                                    views: 0,
                                    visitors: 0,
                                    visits: 0,
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
        page: number = 1,
    ) {
        const allCountsResultPromise = this.getAllCountsByColumn(
            siteId,
            "path",
            interval,
            tz,
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

    async getCountByUserAgent(
        siteId: string,
        interval: string,
        tz?: string,
        page: number = 1,
    ) {
        return this.getVisitorCountByColumn(
            siteId,
            "userAgent",
            interval,
            tz,
            page,
        );
    }

    async getCountByCountry(
        siteId: string,
        interval: string,
        tz?: string,
        page: number = 1,
    ) {
        return this.getVisitorCountByColumn(
            siteId,
            "country",
            interval,
            tz,
            page,
        );
    }

    async getCountByReferrer(
        siteId: string,
        interval: string,
        tz?: string,
        page: number = 1,
    ) {
        return this.getVisitorCountByColumn(
            siteId,
            "referrer",
            interval,
            tz,
            page,
        );
    }
    async getCountByBrowser(
        siteId: string,
        interval: string,
        tz?: string,
        page: number = 1,
    ) {
        return this.getVisitorCountByColumn(
            siteId,
            "browserName",
            interval,
            tz,
            page,
        );
    }

    async getCountByDevice(
        siteId: string,
        interval: string,
        tz?: string,
        page: number = 1,
    ) {
        return this.getVisitorCountByColumn(
            siteId,
            "deviceModel",
            interval,
            tz,
            page,
        );
    }

    async getSitesOrderedByHits(interval: string, tz?: string, limit?: number) {
        // defaults to 1 day if not specified

        limit = limit || 10;

        const intervalSql = intervalToSql(interval, tz);

        const query = `
            SELECT SUM(_sample_interval) as count,
                ${ColumnMappings.siteId} as siteId
            FROM metricsDataset
            WHERE timestamp > ${intervalSql}
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
