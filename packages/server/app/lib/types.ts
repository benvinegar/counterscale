export interface SearchFilters {
    path?: string;
    referrer?: string;
    deviceModel?: string;
    deviceType?: string;
    country?: string;
    browserName?: string;
    browserVersion?: string;
}

export interface User {
    authenticated: boolean;
}
