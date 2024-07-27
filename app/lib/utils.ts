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

export function getFiltersFromUrl(searchParams: URLSearchParams) {
    let path;
    try {
        path = searchParams.get("path") || "";
    } catch (err) {
        path = "";
    }

    const filters: any = {};
    if (path) {
        filters["path"] = path;
    }
    return filters;
}
