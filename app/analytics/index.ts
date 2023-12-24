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

  async getCount(sinceDays: number): Promise<any> {
    // defaults to 1 day if not specified
    const interval = sinceDays || 1;

    const query = `
      SELECT SUM(_sample_interval) as count 
      FROM metricsDataset 
      WHERE timestamp > NOW() - INTERVAL '${interval}' DAY`;

    const returnPromise = new Promise((resolve, reject) => {
      const response = fetch(this.defaultUrl, {
        method: 'POST',
        body: query,
        headers: this.defaultHeaders,
      }).then((response) => {
        resolve(response.json());
      }).catch((error) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  async getCountByReferer(sinceDays: number): Promise<Response> {
    // defaults to 1 day if not specified
    const interval = sinceDays || 1;

    const query = `
      SELECT SUM(_sample_interval) as count, blob2 as referer 
      FROM metricsDataset 
      WHERE timestamp > NOW() - INTERVAL '${interval}' DAY 
      GROUP BY referer
      ORDER BY count DESC
    `;

    const response = await fetch(this.defaultUrl, {
      method: 'POST',
      body: query,
      headers: this.defaultHeaders,
    });
    return response;
  }
}