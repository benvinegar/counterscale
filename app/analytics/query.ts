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

interface AnalyticsQueryResultRow {

    [key: string]: any
}
interface AnalyticsQueryResult {
    meta: string,
    data: AnalyticsQueryResultRow[],
    rows: number,
    rows_before_limit_at_least: number
}

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

    async getCounts(siteId: string, sinceDays: number): Promise<{
        hits: number,
        visits: number
    }> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        const siteIdColumn = ColumnMappings['siteId'];

        const query = `
            SELECT SUM(_sample_interval) as count, double1 as isVisit 
            FROM metricsDataset 
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
            AND ${siteIdColumn} = '${siteId}'
            GROUP BY isVisit
            ORDER BY isVisit ASC`;

        const returnPromise = new Promise<Object>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;
            resolve({
                hits: responseData.data[0]['count'],
                visits: responseData.data[1]['count'],
            })
        })());
        return returnPromise;
    }

    async getCountByColumn(siteId: string, column: string, sinceDays: number, limit?: number): Promise<any> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;
        limit = limit || 10;
        const siteIdColumn = ColumnMappings['siteId'];

        const _column: string = ColumnMappings[column];
        const query = `
            SELECT ${_column}, SUM(_sample_interval) as count 
            FROM metricsDataset 
            WHERE timestamp > NOW() - INTERVAL '${interval}' DAY
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
                return [row[_column], row['count']];
            }));
        })());
        return returnPromise;
    }

    async getCountByUserAgent(siteId: string, sinceDays: number): Promise<any> {
        return this.getCountByColumn(siteId, 'userAgent', sinceDays);
    }

    async getCountByCountry(siteId: string, sinceDays: number): Promise<any> {
        return this.getCountByColumn(siteId, 'country', sinceDays);
    }

    async getCountByReferrer(siteId: string, sinceDays: number): Promise<any> {
        return this.getCountByColumn(siteId, 'referrer', sinceDays);
    }

    async getCountByPath(siteId: string, sinceDays: number): Promise<any> {
        return this.getCountByColumn(siteId, 'path', sinceDays);
    }

    async getCountByBrowser(siteId: string, sinceDays: number): Promise<any> {
        return this.getCountByColumn(siteId, 'browserName', sinceDays);
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
            var result = responseData.data.reduce((acc, cur) => {
                acc.push([cur['siteId'], cur['count']]);
                return acc;
            }, []);

            resolve(result);
        })());
        return returnPromise;
    }
}