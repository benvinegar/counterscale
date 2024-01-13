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

    beforeEach(() => {
        vi.useFakeTimers()
    });

    afterEach(() => {
        vi.useRealTimers()
    });

    describe("getViewsGroupedByInterval", () => {
        test("should return an array of tuples representing [timestamp, count]", async () => {
            const api = new AnalyticsEngineAPI("abc123", "def456");


            const fetch = global.fetch as any;
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

            vi.setSystemTime(new Date("2024-01-18 00:00:00").getTime());

            const result1 = await api.getViewsGroupedByInterval("example.com", "DAY", 7);

            expect(result1).toEqual([
                ["2024-01-11 00:00:00", 0],
                ["2024-01-12 00:00:00", 0],
                ["2024-01-13 00:00:00", 3],
                ["2024-01-14 00:00:00", 0],
                ["2024-01-15 00:00:00", 0],
                ["2024-01-16 00:00:00", 2],
                ["2024-01-17 00:00:00", 1],
            ]);

            expect(await api.getViewsGroupedByInterval("example.com", "DAY", 5))

            const result2 = await api.getViewsGroupedByInterval("example.com", "DAY", 5);
            expect(result2).toEqual([
                ["2024-01-13 00:00:00", 3],
                ["2024-01-14 00:00:00", 0],
                ["2024-01-15 00:00:00", 0],
                ["2024-01-16 00:00:00", 2],
                ["2024-01-17 00:00:00", 1],
            ]);

        });
    });

    describe("getCounts", () => {
        test("should return an object with view, visit, and visitor counts", async () => {
            const api = new AnalyticsEngineAPI("abc123", "def456");

            const fetch = global.fetch as any;
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
});