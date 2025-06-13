import type {
    CountriesByPropertyResponse,
    CountsByPropertyResponse,
    StatsResponse,
    TimeSeriesResponse,
} from "../types/api-types.js";
import { parseReactRouterData } from "../utils/react-router-parser.js";

// Analytics client that makes HTTP requests to the worker endpoints
export class CounterscaleAnalyticsClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        // Remove trailing slash if present
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    private async makeRequest(
        endpoint: string,
        params: Record<string, string | number>,
        routeName?: string,
    ) {
        // Add .data suffix and _routes parameter for React Router resource routes
        const dataEndpoint = `${endpoint}.data`;

        const url = new URL(`${this.baseUrl}${dataEndpoint}`);

        // Add all params as search parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
        });

        // Add _routes parameter if provided
        if (routeName) {
            url.searchParams.set("_routes", routeName);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = (await response.json()) as any[];

        // Parse React Router serialized format
        const parsedData = parseReactRouterData(rawData);

        return parsedData;
    }

    async getStats(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        return this.makeRequest(
            "/resources/stats",
            params,
            "routes/resources.stats",
        ) as Promise<StatsResponse>;
    }

    async getPaths(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
        page: number = 1,
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            page,
            ...filters,
        };

        return this.makeRequest(
            "/resources/paths",
            params,
            "routes/resources.paths",
        ) as Promise<CountsByPropertyResponse>;
    }

    async getReferrers(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
        page: number = 1,
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            page,
            ...filters,
        };

        return this.makeRequest(
            "/resources/referrer",
            params,
            "routes/resources.referrer",
        ) as Promise<CountsByPropertyResponse>;
    }

    async getCountries(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
        page: number = 1,
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            page,
            ...filters,
        };

        return this.makeRequest(
            "/resources/country",
            params,
            "routes/resources.country",
        ) as Promise<CountriesByPropertyResponse>;
    }

    async getBrowsers(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
        page: number = 1,
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            page,
            ...filters,
        };

        return this.makeRequest(
            "/resources/browser",
            params,
            "routes/resources.browser",
        ) as Promise<CountriesByPropertyResponse>;
    }

    async getDevices(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
        page: number = 1,
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            page,
            ...filters,
        };

        return this.makeRequest(
            "/resources/device",
            params,
            "routes/resources.device",
        ) as Promise<CountriesByPropertyResponse>;
    }

    async getTimeSeries(
        siteId: string,
        interval: string = "7d",
        timezone: string = "UTC",
        filters: Record<string, string> = {},
    ) {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        return this.makeRequest(
            "/resources/timeseries",
            params,
            "routes/resources.timeseries",
        ) as Promise<TimeSeriesResponse>;
    }
}
