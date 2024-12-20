import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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

export function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        // Fallback to UTC if browser doesn't support Intl API
        return "UTC";
    }
}

export function getIntervalType(interval: string): "DAY" | "HOUR" {
    switch (interval) {
        case "today":
        case "yesterday":
        case "1d":
            return "HOUR";
        case "7d":
        case "30d":
        case "90d":
            return "DAY";
        default:
            return "DAY";
    }
}

export function getDateTimeRange(interval: string, tz: string) {
    let localDateTime = dayjs().utc();
    let localEndDateTime: dayjs.Dayjs | undefined;

    if (interval === "today") {
        localDateTime = localDateTime.tz(tz).startOf("day");
    } else if (interval === "yesterday") {
        localDateTime = localDateTime.tz(tz).startOf("day").subtract(1, "day");
        localEndDateTime = localDateTime.endOf("day").add(2, "ms");
    } else {
        const daysAgo = Number(interval.split("d")[0]);
        const intervalType = getIntervalType(interval);

        if (intervalType === "DAY") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .tz(tz)
                .startOf("day");
        } else if (intervalType === "HOUR") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .startOf("hour");
        }
    }

    if (!localEndDateTime) {
        localEndDateTime = dayjs().utc().tz(tz);
    }

    return {
        startDate: localDateTime.toDate(),
        endDate: localEndDateTime.toDate(),
    };
}
