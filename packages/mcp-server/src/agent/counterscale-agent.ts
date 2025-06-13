import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { CounterscaleAnalyticsClient } from "../client/analytics-client.js";
import { parseReactRouterData } from "../utils/react-router-parser.js";

// Define our MCP agent with analytics tools
export class CounterscaleAnalyticsMCP extends McpAgent {
    server = new McpServer({
        name: "Counterscale Analytics MCP Server",
        version: "0.0.1",
    });

    private analyticsClient?: CounterscaleAnalyticsClient;

    async setWorkerUrl(url: string) {
        await this.ctx.storage.put("workerUrl", url);
        this.analyticsClient = new CounterscaleAnalyticsClient(url);
    }

    async getWorkerUrl(): Promise<string | undefined> {
        return await this.ctx.storage.get("workerUrl");
    }

    private async getAnalyticsClient(): Promise<CounterscaleAnalyticsClient> {
        if (!this.analyticsClient) {
            const workerUrl = await this.getWorkerUrl();
            if (!workerUrl) {
                throw new Error(
                    "Analytics not configured. Please run setup_analytics first.",
                );
            }
            this.analyticsClient = new CounterscaleAnalyticsClient(workerUrl);
        }
        return this.analyticsClient;
    }

    async init() {
        // Setup analytics connection tool
        this.server.tool(
            "setup_analytics",
            {
                workerUrl: z
                    .string()
                    .describe(
                        "Your Counterscale worker URL (e.g., https://your-worker.workers.dev)",
                    ),
            },
            async ({ workerUrl }) => {
                try {
                    await this.setWorkerUrl(workerUrl);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Analytics client configured for: ${workerUrl}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error setting up analytics: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // List available sites using dashboard.data endpoint
        this.server.tool("list_sites", {}, async () => {
            try {
                const analyticsClient = await this.getAnalyticsClient();

                // Use dashboard.data endpoint with empty site to get sites list
                // Dashboard queries 90 days by default to get all sites
                const url = new URL(
                    `${analyticsClient["baseUrl"]}/dashboard.data`,
                );
                url.searchParams.set("site", "");
                url.searchParams.set("_routes", "routes/dashboard");

                const response = await fetch(url.toString());

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`,
                    );
                }

                const rawData = (await response.json()) as any[];

                // Parse using the standardized React Router parser
                const data = parseReactRouterData(rawData);

                // Check if sites array exists
                if (!data.sites || !Array.isArray(data.sites)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `No sites found. Parsed data: ${JSON.stringify(data)}`,
                            },
                        ],
                    };
                }

                const sitesText = data.sites
                    .map(
                        (site: string, index: number) =>
                            `${index + 1}. ${site || "(unknown)"}`,
                    )
                    .join("\n");

                return {
                    content: [
                        {
                            type: "text",
                            text: `Available Sites (${data.sites.length} total):\n${sitesText}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error fetching sites: ${error}`,
                        },
                    ],
                };
            }
        });

        // Get basic site statistics (views, visitors, bounces)
        this.server.tool(
            "get_site_stats",
            {
                siteId: z.string().describe("Site ID to get stats for"),
                interval: z
                    .string()
                    .default("7d")
                    .describe(
                        "Time interval (today, yesterday, 1d, 7d, 30d, 90d)",
                    ),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe(
                        "Additional filters (path, referrer, country, etc.)",
                    ),
            },
            async ({ siteId, interval, timezone, filters }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const stats = await analyticsClient.getStats(
                        siteId,
                        interval,
                        timezone,
                        filters,
                    );
                    const bounceRateText =
                        stats.hasSufficientBounceData &&
                        stats.bounceRate !== undefined
                            ? `${Math.round(stats.bounceRate * 100)}%`
                            : "n/a";

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Site Stats for ${siteId} (${interval}):\n- Views: ${stats.views || 0}\n- Visitors: ${stats.visitors || 0}\n- Bounce Rate: ${bounceRateText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching site stats: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get top pages/paths
        this.server.tool(
            "get_top_pages",
            {
                siteId: z.string().describe("Site ID to get top pages for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
                page: z
                    .number()
                    .default(1)
                    .describe("Page number for pagination"),
            },
            async ({ siteId, interval, timezone, filters, page }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getPaths(
                        siteId,
                        interval,
                        timezone,
                        filters,
                        page,
                    );
                    const pathsText = result.countsByProperty
                        .map(
                            ([path, views, visitors]: [
                                string,
                                number,
                                number,
                            ]) =>
                                `- ${path}: ${views} views (${visitors} visitors)`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Top Pages for ${siteId} (${interval}, page ${page}):\n${pathsText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching top pages: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get top referrers
        this.server.tool(
            "get_top_referrers",
            {
                siteId: z.string().describe("Site ID to get top referrers for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
                page: z
                    .number()
                    .default(1)
                    .describe("Page number for pagination"),
            },
            async ({ siteId, interval, timezone, filters, page }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getReferrers(
                        siteId,
                        interval,
                        timezone,
                        filters,
                        page,
                    );
                    const referrersText = result.countsByProperty
                        .map(
                            ([referrer, views, visitors]: [
                                string,
                                number,
                                number,
                            ]) =>
                                `- ${referrer}: ${views} views (${visitors} visitors)`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Top Referrers for ${siteId} (${interval}, page ${page}):\n${referrersText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching top referrers: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get top countries
        this.server.tool(
            "get_top_countries",
            {
                siteId: z.string().describe("Site ID to get top countries for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
                page: z
                    .number()
                    .default(1)
                    .describe("Page number for pagination"),
            },
            async ({ siteId, interval, timezone, filters, page }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getCountries(
                        siteId,
                        interval,
                        timezone,
                        filters,
                        page,
                    );
                    const countriesText = result.countsByProperty
                        .map(
                            ([country, visitors]: [string, number]) =>
                                `- ${country}: ${visitors} visitors`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Top Countries for ${siteId} (${interval}, page ${page}):\n${countriesText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching top countries: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get top browsers
        this.server.tool(
            "get_top_browsers",
            {
                siteId: z.string().describe("Site ID to get top browsers for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
                page: z
                    .number()
                    .default(1)
                    .describe("Page number for pagination"),
            },
            async ({ siteId, interval, timezone, filters, page }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getBrowsers(
                        siteId,
                        interval,
                        timezone,
                        filters,
                        page,
                    );
                    const browsersText = result.countsByProperty
                        .map(
                            ([browser, visitors]: [string, number]) =>
                                `- ${browser}: ${visitors} visitors`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Top Browsers for ${siteId} (${interval}, page ${page}):\n${browsersText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching top browsers: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get top devices
        this.server.tool(
            "get_top_devices",
            {
                siteId: z.string().describe("Site ID to get top devices for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
                page: z
                    .number()
                    .default(1)
                    .describe("Page number for pagination"),
            },
            async ({ siteId, interval, timezone, filters, page }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getDevices(
                        siteId,
                        interval,
                        timezone,
                        filters,
                        page,
                    );
                    const devicesText = result.countsByProperty
                        .map(
                            ([device, visitors]: [string, number]) =>
                                `- ${device}: ${visitors} visitors`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Top Devices for ${siteId} (${interval}, page ${page}):\n${devicesText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching top devices: ${error}`,
                            },
                        ],
                    };
                }
            },
        );

        // Get time series data
        this.server.tool(
            "get_timeseries",
            {
                siteId: z
                    .string()
                    .describe("Site ID to get time series data for"),
                interval: z.string().default("7d").describe("Time interval"),
                timezone: z
                    .string()
                    .default("UTC")
                    .describe("Timezone for the query"),
                filters: z
                    .record(z.string())
                    .default({})
                    .describe("Additional filters"),
            },
            async ({ siteId, interval, timezone, filters }) => {
                try {
                    const analyticsClient = await this.getAnalyticsClient();
                    const result = await analyticsClient.getTimeSeries(
                        siteId,
                        interval,
                        timezone,
                        filters,
                    );
                    const seriesText = result.intervalCounts
                        .slice(0, 10)
                        .map(
                            ([timestamp, data]: [string, any]) =>
                                `- ${timestamp}: ${data.views} views, ${data.visitors} visitors`,
                        )
                        .join("\n");

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Time Series for ${siteId} (${interval}, first 10 points):\n${seriesText}`,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error fetching time series: ${error}`,
                            },
                        ],
                    };
                }
            },
        );
    }
}
