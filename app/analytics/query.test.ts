import { describe, expect, test, vi } from 'vitest'

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
    describe("getCounts", () => {
        test("should return an object with view, visit, and visitor counts", async () => {
            const api = new AnalyticsEngineAPI("abc123", "def456");

            const fetch = global.fetch as any;
            fetch.mockResolvedValue(new Promise(resolve => {
                console.log('here i am');
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