import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'

import { AnalyticsEngineAPI } from "./query";

// mock out fetch
global.fetch = vi.fn();
function createFetchResponse(data: any) {
    return {
        ok: true,
        json: () => new Promise((resolve) => resolve(data))
    }
}

describe("AnalyticsEngineAPI", () => {
    const api = new AnalyticsEngineAPI("test_account_id_abc123", "test_api_token_def456");
    const fetch = global.fetch as any;

    beforeEach(() => {
        vi.useFakeTimers()
    });

    afterEach(() => {
        vi.useRealTimers()
    });

    describe("query", () => {
        test("forms a valid HTTP request query for CF analytics engine", () => {
            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({}))
            }));

            api.query("SELECT * FROM web_counter");

            expect(fetch).toHaveBeenCalledWith("https://api.cloudflare.com/client/v4/accounts/test_account_id_abc123/analytics_engine/sql",
                {
                    "body": "SELECT * FROM web_counter",
                    "headers": {
                        "Authorization": "Bearer test_api_token_def456",
                        "X-Source": "Cloudflare-Workers",
                        "content-type": "application/json;charset=UTF-8",
                    },
                    "method": "POST",
                });
        });
    });

    describe("getViewsGroupedByInterval", () => {
        test("should return an array of [timestamp, count] tuples grouped by day", async () => {
            expect(process.env.TZ).toBe("EST");

            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        {
                            count: 3,
                            // note: intentionally sparse data (data for some timestamps missing)
                            bucket: "2024-01-13 05:00:00",
                        },
                        {
                            count: 2,
                            bucket: "2024-01-16 05:00:00"
                        },
                        {
                            count: 1,
                            bucket: "2024-01-17 05:00:00"
                        }
                    ]
                }))
            }));

            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            const result1 = await api.getViewsGroupedByInterval("example.com", "DAY", 7, 'America/New_York');

            // results should all be at 05:00:00 because local timezone is UTC-5 --
            // this set of results represents "start of day" in local tz, which is 5 AM UTC
            expect(result1).toEqual([
                ["2024-01-11 05:00:00", 0],
                ["2024-01-12 05:00:00", 0],
                ["2024-01-13 05:00:00", 3],
                ["2024-01-14 05:00:00", 0],
                ["2024-01-15 05:00:00", 0],
                ["2024-01-16 05:00:00", 2],
                ["2024-01-17 05:00:00", 1],
                ["2024-01-18 05:00:00", 0],
            ]);

            const result2 = await api.getViewsGroupedByInterval("example.com", "DAY", 5, 'America/New_York');
            expect(result2).toEqual([
                ["2024-01-13 05:00:00", 3],
                ["2024-01-14 05:00:00", 0],
                ["2024-01-15 05:00:00", 0],
                ["2024-01-16 05:00:00", 2],
                ["2024-01-17 05:00:00", 1],
                ["2024-01-18 05:00:00", 0],
            ]);
        });
    });

    test("should return an array of [timestamp, count] tuples grouped by hour", async () => {
        expect(process.env.TZ).toBe("EST");

        fetch.mockResolvedValue(new Promise(resolve => {
            resolve(createFetchResponse({
                data: [
                    {
                        count: 3,
                        // note: intentionally sparse data (data for some timestamps missing)
                        bucket: "2024-01-17 11:00:00",
                    },
                    {
                        count: 2,
                        bucket: "2024-01-17 14:00:00"
                    },
                    {
                        count: 1,
                        bucket: "2024-01-17 16:00:00"
                    }
                ]
            }))
        }));

        vi.setSystemTime(new Date("2024-01-18T05:33:02").getTime());

        const result1 = await api.getViewsGroupedByInterval("example.com", "HOUR", 1);

        // reminder results are expressed as UTC
        // so if we want the last 24 hours from 05:00:00 in local time (EST), the actual
        // time range in UTC starts and ends at 10:00:00 (+5 hours)
        expect(result1).toEqual([
            ['2024-01-17 10:00:00', 0],
            ['2024-01-17 11:00:00', 3],
            ['2024-01-17 12:00:00', 0],
            ['2024-01-17 13:00:00', 0],
            ['2024-01-17 14:00:00', 2],
            ['2024-01-17 15:00:00', 0],
            ['2024-01-17 16:00:00', 1],
            ['2024-01-17 17:00:00', 0],
            ['2024-01-17 18:00:00', 0],
            ['2024-01-17 19:00:00', 0],
            ['2024-01-17 20:00:00', 0],
            ['2024-01-17 21:00:00', 0],
            ['2024-01-17 22:00:00', 0],
            ['2024-01-17 23:00:00', 0],
            ['2024-01-18 00:00:00', 0],
            ['2024-01-18 01:00:00', 0],
            ['2024-01-18 02:00:00', 0],
            ['2024-01-18 03:00:00', 0],
            ['2024-01-18 04:00:00', 0],
            ['2024-01-18 05:00:00', 0],
            ['2024-01-18 06:00:00', 0],
            ['2024-01-18 07:00:00', 0],
            ['2024-01-18 08:00:00', 0],
            ['2024-01-18 09:00:00', 0],
            ['2024-01-18 10:00:00', 0]
        ]);
    });

    describe("getCounts", () => {
        test("should return an object with view, visit, and visitor counts", async () => {
            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        {
                            count: 3,
                            isVisit: 1,
                            isVisitor: 0
                        },
                        {
                            count: 2,
                            isVisit: 0,
                            isVisitor: 0
                        },
                        {
                            count: 1,
                            isVisit: 0,
                            isVisitor: 1
                        }
                    ]
                }))
            }));

            const result = await api.getCounts("example.com", 7);
            expect(result).toEqual({
                views: 6,
                visits: 3,
                visitors: 1,
            });
        });
    });

    describe("getVisitorCountByColumn", () => {
        test("it should map logical columns to schema columns and return an array of [column, count] tuples", async () => {
            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({
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
                        }
                    ]
                }))
            }));

            const result = await api.getVisitorCountByColumn("example.com", "country", 7);
            expect(result).toEqual([
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
            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({
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
                        }
                    ]
                }))
            }));

            const result = await api.getSitesOrderedByHits(7);
            expect(result).toEqual([
                ["example.com", 130],
                ["foo.com", 100],
                ["test.dev", 90],
            ]);
        });
    });
});