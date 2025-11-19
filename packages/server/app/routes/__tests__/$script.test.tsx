import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../$script";

describe("Dynamic script route", () => {
    const mockRequest = {
        url: "https://example.com/analytics.js",
    } as Request;

    const mockAssetsFetch = vi.fn();

    const createMockContext = (customScriptName?: string) => ({
        cloudflare: {
            env: {
                CF_TRACKER_SCRIPT_NAME: customScriptName,
                ASSETS: {
                    fetch: mockAssetsFetch,
                },
            },
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAssetsFetch.mockClear();
    });

    describe("loader", () => {
        it("should return 404 for non-JS files", async () => {
            const response = await loader({
                params: { script: "test.txt" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe("Not Found");
        });

        it("should return 404 for undefined script param", async () => {
            const response = await loader({
                params: { script: undefined },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe("Not Found");
        });

        it("should serve default tracker.js", async () => {
            const mockResponse = new Response(
                "console.log('tracker script');",
                {
                    status: 200,
                    headers: { "Content-Type": "application/javascript" },
                },
            );
            mockAssetsFetch.mockResolvedValue(mockResponse);

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe(
                "console.log('tracker script');",
            );
            expect(mockAssetsFetch).toHaveBeenCalledWith(
                "https://example.com/tracker.js",
            );
        });

        it("should serve custom script name when env variable is set", async () => {
            const mockResponse = new Response("console.log('custom script');", {
                status: 200,
                headers: { "Content-Type": "application/javascript" },
            });
            mockAssetsFetch.mockResolvedValue(mockResponse);

            const response = await loader({
                params: { script: "analytics.js" },
                context: createMockContext("analytics"),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe("console.log('custom script');");
            expect(mockAssetsFetch).toHaveBeenCalledWith(
                "https://example.com/tracker.js",
            );
        });

        it("should return 404 for unmatched script names", async () => {
            const response = await loader({
                params: { script: "unknown.js" },
                context: createMockContext("analytics"),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe("Script not found");
        });

        it("should handle fetch errors gracefully", async () => {
            mockAssetsFetch.mockRejectedValue(new Error("Fetch failed"));

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error serving script");
        });

        it("should handle network errors", async () => {
            mockAssetsFetch.mockRejectedValue(new Error("Network error"));

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error serving script");
        });

        it("should return response from ASSETS fetch", async () => {
            const mockResponse = new Response(
                "console.log('tracker script');",
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/javascript",
                        "Cache-Control": "public, max-age=3600",
                    },
                },
            );
            mockAssetsFetch.mockResolvedValue(mockResponse);

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response).toBe(mockResponse);
            expect(mockAssetsFetch).toHaveBeenCalledWith(
                "https://example.com/tracker.js",
            );
        });
    });
});
