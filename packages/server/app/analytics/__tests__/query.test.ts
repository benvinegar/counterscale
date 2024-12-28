import {
    describe,
    expect,
    test,
    vi,
    beforeEach,
    afterEach,
    Mock,
    beforeAll,
} from "vitest";

import { AnalyticsEngineAPI, intervalToSql } from "../query";

function createFetchResponse<T>(data: T) {
    return {
        ok: true,
        json: () => new Promise<T>((resolve) => resolve(data)),
    };
}

describe("AnalyticsEngineAPI", () => {
    const api = new AnalyticsEngineAPI(
        "test_account_id_abc123",
        "test_api_token_def456",
    );
    let fetch: Mock; // todo: figure out how to type this mocked fetch

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("query", () => {
        test("forms a valid HTTP request query for CF analytics engine", () => {
            fetch.mockResolvedValue(createFetchResponse({}));

            api.query("SELECT * FROM web_counter");

            expect(fetch).toHaveBeenCalledWith(
                "https://api.cloudflare.com/client/v4/accounts/test_account_id_abc123/analytics_engine/sql",
                {
                    body: "SELECT * FROM web_counter",
                    headers: {
                        Authorization: "Bearer test_api_token_def456",
                        "X-Source": "Cloudflare-Workers",
                        "content-type": "application/json;charset=UTF-8",
                    },
                    method: "POST",
                },
            );
        });
    });

    describe("getViewsGroupedByInterval", () => {
        test("should return an array of [timestamp, count] tuples grouped by day", async () => {
            expect(process.env.TZ).toBe("EST");

            fetch.mockResolvedValue(
                createFetchResponse({
                    data: [
                        {
                            count: 3,
                            // note: intentionally sparse data (data for some timestamps missing)
                            bucket: "2024-01-13 05:00:00",
                        },
                        {
                            count: 2,
                            bucket: "2024-01-16 05:00:00",
                        },
                        {
                            count: 1,
                            bucket: "2024-01-17 05:00:00",
                        },
                    ],
                }),
            );

            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            const result1 = await api.getViewsGroupedByInterval(
                "example.com",
                "DAY",
                new Date("2024-01-11 00:00:00"), // local time (because tz also passed)
                new Date(),
                "America/New_York",
            );

            // results should all be at 05:00:00 because local timezone is UTC-5 --
            // this set of results represents "start of day" in local tz, which is 5 AM UTC
            expect(result1).toEqual([
                ["2024-01-11 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-12 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-13 05:00:00", { views: 3, visitors: 0, bounces: 0 }],
                ["2024-01-14 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-15 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-16 05:00:00", { views: 2, visitors: 0, bounces: 0 }],
                ["2024-01-17 05:00:00", { views: 1, visitors: 0, bounces: 0 }],
                ["2024-01-18 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
            ]);

            const result2 = await api.getViewsGroupedByInterval(
                "example.com",
                "DAY",
                new Date("2024-01-13 00:00:00"), // local time (because tz also passed)
                new Date(),
                "America/New_York",
            );
            expect(result2).toEqual([
                ["2024-01-13 05:00:00", { views: 3, visitors: 0, bounces: 0 }],
                ["2024-01-14 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-15 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-16 05:00:00", { views: 2, visitors: 0, bounces: 0 }],
                ["2024-01-17 05:00:00", { views: 1, visitors: 0, bounces: 0 }],
                ["2024-01-18 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
            ]);
        });

        test("should return an array of [timestamp, count] tuples grouped by hour", async () => {
            expect(process.env.TZ).toBe("EST");

            fetch.mockResolvedValue(
                createFetchResponse({
                    data: [
                        {
                            count: 3,
                            isVisitor: 0,
                            isBounce: 0,
                            // note: intentionally sparse data (data for some timestamps missing)
                            bucket: "2024-01-17 11:00:00",
                        },
                        {
                            count: 2,
                            isVisitor: 0,
                            isBounce: 0,
                            bucket: "2024-01-17 14:00:00",
                        },
                        {
                            count: 1,
                            isVisitor: 0,
                            isBounce: 0,
                            bucket: "2024-01-17 16:00:00",
                        },
                    ],
                }),
            );

            vi.setSystemTime(new Date("2024-01-18T05:33:02").getTime());

            const result1 = await api.getViewsGroupedByInterval(
                "example.com",
                "HOUR",
                new Date("2024-01-17 05:00:00"), // local time (because tz also passed)
                new Date(),
                "America/New_York",
            );

            // reminder results are expressed as UTC
            // so if we want the last 24 hours from 05:00:00 in local time (EST), the actual
            // time range in UTC starts and ends at 10:00:00 (+5 hours)
            expect(result1).toEqual([
                ["2024-01-17 10:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 11:00:00", { views: 3, visitors: 0, bounces: 0 }],
                ["2024-01-17 12:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 13:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 14:00:00", { views: 2, visitors: 0, bounces: 0 }],
                ["2024-01-17 15:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 16:00:00", { views: 1, visitors: 0, bounces: 0 }],
                ["2024-01-17 17:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 18:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 19:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 20:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 21:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 22:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-17 23:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 00:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 01:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 02:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 03:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 04:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 05:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 06:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 07:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 08:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 09:00:00", { views: 0, visitors: 0, bounces: 0 }],
                ["2024-01-18 10:00:00", { views: 0, visitors: 0, bounces: 0 }],
            ]);
        });

        test("corrects negative bounce values by moving them to previous bucket", async () => {
            const mockResponse = {
                data: [
                    // First bucket has 10 bounces
                    {
                        bucket: "2024-01-01 00:00:00",
                        count: 10,
                        isVisitor: 1,
                        isBounce: 1,
                    },
                    {
                        bucket: "2024-01-01 00:00:00",
                        count: 2,
                        isVisitor: 1,
                        isBounce: -1,
                    },
                    // Second bucket has -2 bounces (which should get moved to first bucket)
                    {
                        bucket: "2024-01-01 01:00:00",
                        count: 8,
                        isVisitor: 1,
                        isBounce: 1,
                    },
                    {
                        bucket: "2024-01-01 01:00:00",
                        count: 10, // 8 - 10 = -2
                        isVisitor: 1,
                        isBounce: -1,
                    },
                    {
                        bucket: "2024-01-01 02:00:00",
                        count: 20,
                        isVisitor: 1,
                        isBounce: 1,
                    },
                    {
                        bucket: "2024-01-01 02:00:00",
                        count: 8,
                        isVisitor: 1,
                        isBounce: -1,
                    },
                ],
                meta: { total: 3 },
            };

            fetch.mockResolvedValue(createFetchResponse(mockResponse));
            vi.setSystemTime(new Date("2024-01-18T05:33:02").getTime());

            const result = await api.getViewsGroupedByInterval(
                "test-site",
                "HOUR",
                new Date("2024-01-01"),
                new Date("2024-01-02"),
                "America/New_York",
            );

            expect(result).toHaveLength(24); // still returns 24 buckets

            // First bucket should have had its bounces reduced by 2
            expect(result[0][1].bounces).toBe(6);
            // Second bucket should have been zeroed out
            expect(result[1][1].bounces).toBe(0);
            // Third bucket should be unchanged
            expect(result[2][1].bounces).toBe(12);
        });
    });

    describe("getCounts", () => {
        test("should return an object with view, visitor, and bounce counts", async () => {
            fetch.mockResolvedValue(
                createFetchResponse({
                    data: [
                        {
                            count: 3,
                            isVisitor: 0,
                            isBounce: 1,
                        },
                        {
                            count: 2,
                            isVisitor: 0,
                            isBounce: 0,
                        },
                        {
                            count: 1,
                            isVisitor: 1,
                            isBounce: -1,
                        },
                    ],
                }),
            );

            const result = api.getCounts("example.com", "7d");

            // verify fetch was invoked before awaiting result
            expect(fetch).toHaveBeenCalled();
            expect(await result).toEqual({
                views: 6,
                visitors: 1,
                bounces: 2,
            });
        });
    });

    describe("getVisitorCountByColumn", () => {
        test("it should map logical columns to schema columns and return an array of [column, count] tuples", async () => {
            fetch.mockResolvedValue(
                createFetchResponse({
                    data: [
                        {
                            blob4: "CA",
                            count: 3,
                        },
                        {
                            blob4: "US",
                            count: 2,
                        },
                        {
                            blob4: "GB",
                            count: 1,
                        },
                    ],
                }),
            );

            const result = api.getVisitorCountByColumn(
                "example.com",
                "country",
                "7d",
            );

            // verify fetch was invoked before awaiting result
            expect(fetch).toHaveBeenCalled();
            expect(await result).toEqual([
                ["CA", 3],
                ["US", 2],
                ["GB", 1],
            ]);
        });
    });

    describe("getSitesOrderedByHits", () => {
        test("it should return an array of [siteId, count] tuples", async () => {
            // note: getSitesByHits orders by count descending in SQL; since we're mocking
            //       the HTTP/SQL response, the mocked results are pre-sorted
            fetch.mockResolvedValue(
                createFetchResponse({
                    data: [
                        {
                            siteId: "example.com",
                            count: 130,
                        },
                        {
                            siteId: "foo.com",
                            count: 100,
                        },
                        {
                            siteId: "test.dev",
                            count: 90,
                        },
                    ],
                }),
            );

            const result = api.getSitesOrderedByHits("7d");
            // verify fetch was invoked before awaiting result
            expect(fetch).toHaveBeenCalled();
            expect(await result).toEqual([
                ["example.com", 130],
                ["foo.com", 100],
                ["test.dev", 90],
            ]);
        });
    });

    describe("getAllCountsByColumn", () => {
        test("it should return an array of [column, count] tuples", async () => {
            // return 2 mocked responses
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        {
                            blob4: "CA",
                            isVisitor: 1,
                            count: 3,
                        },
                    ],
                }),
            );
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        {
                            blob4: "CA",
                            isVisitor: 0,
                            count: 1,
                        },
                    ],
                }),
            );

            const result = await api.getAllCountsByColumn(
                "example.com",
                "country",
                "7d",
                "America/New_York",
                {
                    country: "CA",
                },
            );

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(
                (fetch as Mock).mock.calls[0][1].body
                    .replace(/\s+/g, " ") // removes tabs and whitespace from query
                    .trim(),
            );
            // console.log(result);
            expect(await result).toEqual({
                CA: {
                    views: 4,
                    visitors: 3,
                    bounces: 0,
                },
            });
        });

        test("should handle case where there are no results", async () => {
            fetch
                .mockResolvedValueOnce(
                    createFetchResponse({
                        data: [], // no visitor count results
                    }),
                )
                .mockResolvedValueOnce(
                    createFetchResponse({
                        data: [], // no non-visitor results
                    }),
                );

            const result = await api.getAllCountsByColumn(
                "example.com",
                "path",
                "DAY",
                "America/New_York",
            );

            expect(result).toEqual({});
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe("getEarliestEvents", () => {
        test("returns both earliest event and bounce dates when found", async () => {
            const mockEventTimestamp = "2024-01-01T10:00:00Z";
            const mockBounceTimestamp = "2024-01-01T12:00:00Z";

            // Mock responses for both queries
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    ok: true,
                    data: [
                        { earliestEvent: mockBounceTimestamp, isBounce: 1 },
                        { earliestEvent: mockEventTimestamp, isBounce: 0 },
                    ],
                }),
            );

            const result = await api.getEarliestEvents("test-site");
            expect(result).toEqual({
                earliestEvent: new Date(mockEventTimestamp),
                earliestBounce: new Date(mockBounceTimestamp),
            });
        });

        test("returns only earliest event when no bounces found", async () => {
            const mockEventTimestamp = "2024-01-01T10:00:00Z";

            // Mock responses for both queries
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    ok: true,
                    data: [{ earliestEvent: mockEventTimestamp, isBounce: 0 }],
                }),
            );

            const result = await api.getEarliestEvents("test-site");
            expect(result).toEqual({
                earliestEvent: new Date(mockEventTimestamp),
                earliestBounce: null,
            });
        });
    });
});

describe("intervalToSql", () => {
    beforeAll(() => {
        vi.setSystemTime(new Date("2024-04-29T09:33:02").getTime());
    });

    // test intervalToSql
    test("should return the proper sql interval for 1d, 30d, 90d, etc (days)", () => {
        expect(intervalToSql("1d")).toStrictEqual({
            startIntervalSql: "NOW() - INTERVAL '1' DAY",
            endIntervalSql: "NOW()",
        });
        expect(intervalToSql("30d")).toStrictEqual({
            startIntervalSql: "NOW() - INTERVAL '30' DAY",
            endIntervalSql: "NOW()",
        });
        expect(intervalToSql("90d")).toStrictEqual({
            startIntervalSql: "NOW() - INTERVAL '90' DAY",
            endIntervalSql: "NOW()",
        });
    });

    test("should return the proper tz-adjusted sql interval for 'today'", () => {
        expect(intervalToSql("today", "America/New_York")).toStrictEqual({
            startIntervalSql: "toDateTime('2024-04-29 04:00:00')",
            endIntervalSql: "NOW()",
        });
        expect(intervalToSql("today", "America/Los_Angeles")).toStrictEqual({
            startIntervalSql: "toDateTime('2024-04-29 07:00:00')",
            endIntervalSql: "NOW()",
        });
    });

    test("should return the proper tz-adjusted sql interval for 'yesterday'", () => {
        expect(intervalToSql("yesterday", "America/New_York")).toStrictEqual({
            startIntervalSql: "toDateTime('2024-04-28 04:00:00')",
            endIntervalSql: "toDateTime('2024-04-29 04:00:00')",
        });
        expect(intervalToSql("yesterday", "America/Los_Angeles")).toStrictEqual(
            {
                startIntervalSql: "toDateTime('2024-04-28 07:00:00')",
                endIntervalSql: "toDateTime('2024-04-29 07:00:00')",
            },
        );
    });
});
