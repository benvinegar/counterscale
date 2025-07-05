// Type definitions for API responses
export interface StatsResponse {
    views: number;
    visitors: number;
    bounceRate?: number;
    hasSufficientBounceData: boolean;
}

export interface CountsByPropertyResponse {
    countsByProperty: Array<[string, number, number]>;
    page: number;
}

export interface CountriesByPropertyResponse {
    countsByProperty: Array<[string, number]>;
    page: number;
}

export interface TimeSeriesResponse {
    intervalCounts: Array<
        [string, { views: number; visitors: number; bounces: number }]
    >;
}
