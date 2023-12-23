export default class AnalyticsEngineAPI {
  cfApiToken: string;
  cfAccountId: string;
  defaultHeaders: {
    "content-type": string;
    "X-Source": string;
    "Authorization": string;
  };

  constructor(cfAccountId: string, cfApiToken: string) {
    this.cfAccountId = cfAccountId;
    this.cfApiToken = cfApiToken;

    this.defaultHeaders = {
      "content-type": "application/json;charset=UTF-8",
      "X-Source": "Cloudflare-Workers",
      "Authorization": `Bearer ${this.cfApiToken}`
    }
  }

  async getCount(sinceDays: number): Promise<Response> {
    // defaults to 1 day if not specified
    const interval = sinceDays || 1;

    const query = `SELECT SUM(_sample_interval) as count FROM metricsDataset WHERE timestamp > NOW() - INTERVAL '${interval}' DAY`;

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/analytics_engine/sql`, {
      method: 'POST',
      body: query,
      headers: this.defaultHeaders,
    });
    return response;
  }
}