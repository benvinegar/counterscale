interface AnalyticsQueryResult {
    meta: string,
    data: [
        {
            [key: string]: any
        }
    ],
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

    async getCount(sinceDays: number): Promise<number> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;

        const query = `
      SELECT SUM(_sample_interval) as count 
      FROM metricsDataset 
      WHERE timestamp > NOW() - INTERVAL '${interval}' DAY`;

        const returnPromise = new Promise<number>((resolve, reject) => (async () => {
            const response = await fetch(this.defaultUrl, {
                method: 'POST',
                body: query,
                headers: this.defaultHeaders,
            });

            if (!response.ok) {
                reject(response.statusText);
            }

            const responseData = await response.json() as AnalyticsQueryResult;
            resolve(responseData.data[0]['count']);
        })());
        return returnPromise;
    }

    async getCountByReferer(sinceDays: number): Promise<any> {
        // defaults to 1 day if not specified
        const interval = sinceDays || 1;

        const query = `
      SELECT SUM(_sample_interval) as count, blob2 as referer 
      FROM metricsDataset 
      WHERE timestamp > NOW() - INTERVAL '${interval}' DAY 
      GROUP BY referer
      ORDER BY count DESC
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
                acc.push([cur['referer'], cur['count']]);
                return acc;
            }, []);
            console.log(result);;
            resolve(result);
        })());
        return returnPromise;
    }
}