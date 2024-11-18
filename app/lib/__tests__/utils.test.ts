import { getFiltersFromSearchParams, getDateTimeRange } from "../utils";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// test this getfiltersfromsearchparams function
describe("getFiltersFromSearchParams", () => {
    test("it should return an object with the correct keys", () => {
        const searchParams = new URLSearchParams(
            "?path=/about&referrer=google.com&deviceModel=iphone&country=us&browserName=chrome",
        );
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
            referrer: "google.com",
            deviceModel: "iphone",
            country: "us",
            browserName: "chrome",
        });
    });

    test("it should ignore keys it doesn't recognize", () => {
        // only path is valid; unknown should be discarded
        const searchParams = new URLSearchParams("?unknown=foo&path=/about");
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
        });
    });
});

describe("getDateTimeRange", () => {
    const tz = "America/Los_Angeles";
    const mockDate = new Date("2024-01-15T15:00:00Z"); // 7am PST on Jan 15, 2024

    beforeEach(() => {
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("handles 'today' interval", () => {
        const { startDate, endDate } = getDateTimeRange("today", tz);

        // Start date should be Jan 15, 2024 00:00 PST
        expect(startDate).toEqual(new Date("2024-01-15T08:00:00Z")); // 00:00 PST = 08:00 UTC
        expect(endDate).toEqual(new Date("2024-01-15T15:00:00Z")); // Current time (7am PST = 15:00 UTC)
    });

    test("handles 'yesterday' interval", () => {
        const { startDate, endDate } = getDateTimeRange("yesterday", tz);

        expect(startDate).toEqual(new Date("2024-01-14T08:00:00Z"));
        expect(endDate).toEqual(new Date("2024-01-15T08:00:00.001Z"));
    });

    test("handles '7d' interval", () => {
        const { startDate, endDate } = getDateTimeRange("7d", tz);

        expect(startDate).toEqual(new Date("2024-01-08T08:00:00Z"));
        expect(endDate).toEqual(new Date("2024-01-15T15:00:00Z"));
    });

    test("handles '1d' interval", () => {
        const { startDate, endDate } = getDateTimeRange("1d", tz);

        expect(startDate).toEqual(new Date("2024-01-14T15:00:00Z"));
        expect(endDate).toEqual(new Date("2024-01-15T15:00:00Z"));
    });

    test("works with different timezones", () => {
        const tokyoTz = "Asia/Tokyo"; // UTC+9
        const londonTz = "Europe/London"; // UTC+0 in January

        // When it's 7am PST (15:00 UTC) on Jan 15:
        // - Tokyo: 00:00 JST on Jan 16
        // - London: 15:00 GMT on Jan 15
        // - LA: 7:00 PST on Jan 15

        const tokyo = getDateTimeRange("today", tokyoTz);
        const london = getDateTimeRange("today", londonTz);

        // Tokyo's start date should be Jan 15 15:00 UTC (00:00 JST Jan 16)
        expect(tokyo.startDate).toEqual(new Date("2024-01-15T15:00:00Z"));
        // London's start date should be Jan 15 00:00 UTC
        expect(london.startDate).toEqual(new Date("2024-01-15T00:00:00Z"));
    });
});
