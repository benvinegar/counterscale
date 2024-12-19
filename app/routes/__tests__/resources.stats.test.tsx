import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { loader } from "../resources.stats";

describe("resources.stats loader", () => {
    let mockGetCounts: any;
    beforeEach(() => {
        mockGetCounts = vi.fn().mockResolvedValue({
            views: 1000,
            visitors: 250,
            bounces: 125,
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test("returns formatted stats from analytics engine", async () => {
        vi.setSystemTime(new Date("2023-01-01T06:00:00").getTime());

        const mockGetEarliestEvents = vi.fn().mockResolvedValue({
            // earliest event and earliest bounce are the same
            earliestEvent: new Date("2023-01-01T00:00:00Z"),
            earliestBounce: new Date("2023-01-01T00:00:00Z"),
        });

        const context = {
            analyticsEngine: {
                getCounts: mockGetCounts,
                getEarliestEvents: mockGetEarliestEvents,
            },
        };

        const request = new Request(
            "https://example.com/resources/stats?site=test-site&interval=24h&timezone=UTC",
        );

        const response = await loader({ context, request } as any);
        const data = await response;

        expect(mockGetCounts).toHaveBeenCalledWith(
            "test-site",
            "24h",
            "UTC",
            expect.any(Object),
        );

        expect(data).toEqual({
            views: 1000,
            visitors: 250,
            bounceRate: 0.5,
            hasSufficientBounceData: true,
        });
    });

    test("if bounce data isn't complete for the given interval, hasSufficientBounceData is false", async () => {
        // set system time as jan 8th
        vi.setSystemTime(new Date("2023-01-08T00:00:00").getTime());

        const mockGetEarliestEvents = vi.fn().mockResolvedValue({
            earliestEvent: new Date("2023-01-01T00:00:00Z"),
            earliestBounce: new Date("2023-01-04T00:00:00Z"), // Jan 4
        });

        const context = {
            analyticsEngine: {
                getCounts: mockGetCounts,
                getEarliestEvents: mockGetEarliestEvents,
            },
        };

        const request = new Request(
            // 7 day interval (specified in query string)
            "https://example.com/resources/stats?site=test-site&interval=7d&timezone=UTC",
        );

        const response = await loader({ context, request } as any);
        const data = await response;

        expect(data).toEqual({
            views: 1000,
            visitors: 250,
            bounceRate: 0.5,
            hasSufficientBounceData: false,
        });
    });

    test("if bounce data *IS* complete for the given interval, show it", async () => {
        // set system time as jan 8th
        vi.setSystemTime(new Date("2023-01-08T00:00:00").getTime());

        const mockGetEarliestEvents = vi.fn().mockResolvedValue({
            earliestEvent: new Date("2023-01-01T00:00:00Z"),
            earliestBounce: new Date("2023-01-04T00:00:00Z"), // Jan 4 -- well before Jan 8th minus 1 day interval
        });

        const context = {
            analyticsEngine: {
                getCounts: mockGetCounts,
                getEarliestEvents: mockGetEarliestEvents,
            },
        };

        const request = new Request(
            // 1 day interval (specified in query string)
            "https://example.com/resources/stats?site=test-site&interval=1d&timezone=UTC",
        );

        const response = await loader({ context, request } as any);
        const data = await response;

        expect(data).toEqual({
            views: 1000,
            visitors: 250,
            bounceRate: 0.5,
            hasSufficientBounceData: true,
        });
    });
});
