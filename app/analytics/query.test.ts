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
    const api = new AnalyticsEngineAPI("abc123", "def456");
    const fetch = global.fetch as any;

    beforeEach(() => {
        vi.useFakeTimers()
    });

    afterEach(() => {
        vi.useRealTimers()
    });

    describe("getViewsGroupedByInterval", () => {
        test("should return an array of [timestamp, count] tuples grouped by day", async () => {
            fetch.mockResolvedValue(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        {
                            count: 3,
                            // note: intentionally sparse data (data for some timestamps missing)
                            bucket: "2024-01-13 00:00:00",
                        },
                        {
                            count: 2,
                            bucket: "2024-01-16 00:00:00"
                        },
                        {
                            count: 1,
                            bucket: "2024-01-17 00:00:00"
                        }
                    ]
                }))
            }));

            vi.setSystemTime(new Date("2024-01-18T05:33:02").getTime());

            const result1 = await api.getViewsGroupedByInterval("example.com", "DAY", 7);

            expect(result1).toEqual([
                ["2024-01-11 00:00:00", 0],
                ["2024-01-12 00:00:00", 0],
                ["2024-01-13 00:00:00", 3],
                ["2024-01-14 00:00:00", 0],
                ["2024-01-15 00:00:00", 0],
                ["2024-01-16 00:00:00", 2],
                ["2024-01-17 00:00:00", 1],
                ["2024-01-18 00:00:00", 0],
            ]);

            expect(await api.getViewsGroupedByInterval("example.com", "DAY", 5))

            const result2 = await api.getViewsGroupedByInterval("example.com", "DAY", 5);
            expect(result2).toEqual([
                ["2024-01-13 00:00:00", 3],
                ["2024-01-14 00:00:00", 0],
                ["2024-01-15 00:00:00", 0],
                ["2024-01-16 00:00:00", 2],
                ["2024-01-17 00:00:00", 1],
                ["2024-01-18 00:00:00", 0],
            ]);
        });
    });

    test("should return an array of [timestamp, count] tuples grouped by hour", async () => {
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

        expect(result1).toEqual([
            ['2024-01-17 05:00:00', 0],
            ['2024-01-17 06:00:00', 0],
            ['2024-01-17 07:00:00', 0],
            ['2024-01-17 08:00:00', 0],
            ['2024-01-17 09:00:00', 0],
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
            ['2024-01-18 05:00:00', 0]
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
});