interface ColumnMappingsType {
    [key: string]: any
}

const ColumnMappings: ColumnMappingsType = {
    host: "blob1",
    userAgent: "blob2",
    path: "blob3",
    country: "blob4",
    referrer: "blob5",
    browserName: "blob6",
    deviceModel: "blob7",
    siteId: "blob8",

    newVisitor: "double1",
    newSession: "double2",
};

export interface AnalyticsQueryResultRow {
    [key: string]: any
}
interface AnalyticsQueryResult {
    meta: string,
    data: AnalyticsQueryResultRow[],
    rows: number,
    rows_before_limit_at_least: number
}

interface AnalyticsCountResult {
    views: number,
    visits: number,
    visitors: number
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
        "Authorization": string;
    };
    defaultUrl: string;

    constructor(cfAccountId: string, cfApiToken: string) {
        this.cfAccountId = cfAccountId;
        this.cfApiToken = cfApiToken;

        this.defaultUrl = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/analytics_engine/sql`;
        this.defaultHeaders = {
            "content-type": "application/json;charset=UTF-8",
            "X-Source": "Cloudflare-Workers",
            "Authorization": `Bearer ${this.cfApiToken}`
        }
    }

    getIntervalBucketSQLParams(sinceDays: number): [string, number] {
        let intervalType = 'DAY';
        let intervalCount = 1;

        if (sinceDays < 7) {
            intervalType = 'HOUR';
            intervalCount = 24;
        } else if (sinceDays <= 30) {
            intervalType = 'DAY';
            intervalCount = 1;
        }
        return [intervalType, intervalCount];
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
    generateInitialRows(intervalType: string, intervalCount: number): any {
        const startDateTime = new Date();
        let intervalMs = 0;

        console.log("intervalType", intervalType);
        console.log("intervalCount", intervalCount);

        // get start date in the past by subtracting interval * type
        if (intervalType === 'DAY') {
            // get intervalCount days in the past
            startDateTime.setDate(startDateTime.getDate() - intervalCount);
            startDateTime.setHours(0);
            intervalMs = 24 * 60 * 60 * 1000;

        } else if (intervalType === 'HOUR') {
            // get intervalCount hours in the past
            startDateTime.setHours(startDateTime.getHours() - intervalCount);
            intervalMs = 60 * 60 * 1000;
        }

        startDateTime.setMinutes(0, 0, 0);

        const initialRows: any = {};
        for (let i = startDateTime.getTime(); i < Date.now(); i += intervalMs) {
            const rowDate = new Date(i);
            const key =
                rowDate.toISOString().split("T")[0] +
                " " +
                rowDate.toTimeString().split(" ")[0];
            initialRows[key] = 0;
        }

        return initialRows;
    }

    async getViewsGroupedByInterval(siteId: string, sinceDays: number): Promise<any> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        const siteIdColumn = ColumnMappings['siteId'];

        const [intervalType, intervalCount] = this.getIntervalBucketSQLParams(sinceDays);

        // get start date in the past by subtracting interval * type
        const dataStartDate = new Date();

        // note interval count hard-coded to hours at the moment
        const initialRows = this.generateInitialRows(intervalType, intervalCount);

        // NOTE: when using toStartOfInterval, cannot group by other columns
        //       like double1 (isVisitor) or double2 (isSession/isVisit). This
        //       is just a limitation of Cloudflare Analytics Engine.
        //       -- but you can filter on them (using WHERE)
        const query = `
            SELECT SUM(_sample_interval) as count,
            toStartOfInterval(timestamp, INTERVAL '${intervalCount}' ${intervalType}) as bucket
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY bucket
            ORDER BY bucket ASC`;

        const returnPromise = new Promise<any>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;

            // note this query will return sparse data (i.e. only rows where count > 0)
            // merge returnedRows with initial rows to fill in any gaps
            const rowsByDateTime = responseData.data.reduce((accum, row) => {
                accum[row['bucket']] = row['count'];
                return accum;
            }, initialRows);

            // return as sorted array of tuples (i.e. [datetime, count])
            const sortedRows = Object.entries(rowsByDateTime).sort((a: any, b: any) => {
                if (a[0] < b[0]) return -1;
                else if (a[0] > b[0]) return 1;
                else return 0;
            });

            resolve(sortedRows);
        })());
        return returnPromise;
    }

    async getCounts(siteId: string, sinceDays: number): Promise<AnalyticsCountResult> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        const siteIdColumn = ColumnMappings['siteId'];

        const query = `
            SELECT SUM(_sample_interval) as count, double1 as isVisitor, double2 as isVisit
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY isVisitor, isVisit
            ORDER BY isVisitor, isVisit ASC`;

        const returnPromise = new Promise<AnalyticsCountResult>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;


            const counts: AnalyticsCountResult = {
                views: 0,
                visitors: 0,
                visits: 0
            }

            // NOTE: note it's possible to get no results, or half results (i.e. a row where isVisit=1 but
            //       no row where isVisit=0), so this code makes no assumption on number of results
            responseData.data.forEach((row) => {
                if (row.isVisit === 1) {
                    counts.visits += Number(row.count);
                }
                if (row.isVisitor === 1) {
                    counts.visitors += Number(row.count);
                }
                counts.views += Number(row.count);
            });

            resolve(counts);

        })());
        return returnPromise;
    }

    async getVisitorCountByColumn(siteId: string, column: string, sinceDays: number, limit?: number): Promise<any> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        limit = limit || 10;
        const siteIdColumn = ColumnMappings['siteId'];

        const _column: string = ColumnMappings[column];
        const query = `
            SELECT ${_column}, SUM(_sample_interval) as count
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            AND double1 = 1
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY ${_column}
            ORDER BY count DESC
            LIMIT ${limit}`;

        const returnPromise = new Promise<any>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;
            resolve(responseData.data.map((row) => {
                const key = row[_column] === '' ? '(none)' : row[_column];
                return [key, row['count']];
            }));
        })());
        return returnPromise;
    }

    async getCountByUserAgent(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'userAgent', sinceDays);
    }

    async getCountByCountry(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'country', sinceDays);
    }

    async getCountByReferrer(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'referrer', sinceDays);
    }

    async getCountByPath(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'path', sinceDays);
    }

    async getCountByBrowser(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'browserName', sinceDays);
    }

    async getCountByDevice(siteId: string, sinceDays: number): Promise<any> {
        return this.getVisitorCountByColumn(siteId, 'deviceModel', sinceDays);
    }

    async getSitesByHits(sinceDays: number, limit?: number): Promise<any> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        limit = limit || 10;

        const query = `
            SELECT SUM(_sample_interval) as count, blob8 as siteId
            FROM metricsDataset
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            GROUP BY siteId
            ORDER BY count DESC
            LIMIT ${limit}
        `;
        const returnPromise = new Promise<any>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;
            const result = responseData.data.reduce((acc, cur) => {
                acc.push([cur['siteId'], cur['count']]);
                return acc;
            }, []);

            resolve(result);
        })());
        return returnPromise;
    }
}