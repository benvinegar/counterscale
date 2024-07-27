import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function paramsFromUrl(url: string) {
    const searchParams = new URL(url).searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

interface SearchFilters {
    path?: string;
    referrer?: string;
    deviceModel?: string;
    country?: string;
    browserName?: string;
}

export function getFiltersFromSearchParams(searchParams: URLSearchParams) {
    const filters: SearchFilters = {};

    if (searchParams.has("path")) {
        filters.path = searchParams.get("path") || "";
    }
    if (searchParams.has("referrer")) {
        filters.referrer = searchParams.get("referrer") || "";
    }
    if (searchParams.has("deviceModel")) {
        filters.deviceModel = searchParams.get("deviceModel") || "";
    }
    if (searchParams.has("country")) {
        filters.country = searchParams.get("country") || "";
    }
    if (searchParams.has("browserName")) {
        filters.browserName = searchParams.get("browserName") || "";
    }

    return filters;
}
