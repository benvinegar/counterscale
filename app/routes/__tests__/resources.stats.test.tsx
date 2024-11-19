import { describe, test, expect, vi } from "vitest";
import { loader } from "../resources.stats";

describe("resources.stats loader", () => {
    test("returns formatted stats from analytics engine", async () => {
        const mockGetCounts = vi.fn().mockResolvedValue({
            views: 1000,
            visits: 500,
            visitors: 250,
        });

        const context = {
            analyticsEngine: {
                getCounts: mockGetCounts,
            },
        };

        const request = new Request(
            "https://example.com/resources/stats?site=test-site&interval=24h&timezone=UTC",
        );

        const response = await loader({ context, request } as any);
        const data = await response.json();

        expect(mockGetCounts).toHaveBeenCalledWith(
            "test-site",
            "24h",
            "UTC",
            expect.any(Object),
        );

        expect(data).toEqual({
            views: 1000,
            visits: 500,
            visitors: 250,
        });
    });
});
