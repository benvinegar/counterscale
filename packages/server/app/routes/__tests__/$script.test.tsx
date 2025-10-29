import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../$script";

// Mock fetch globally
global.fetch = vi.fn();

describe("Dynamic script route", () => {
    const mockRequest = {
        url: "https://example.com/analytics.js",
    } as Request;

    const createMockContext = (customScriptName?: string) => ({
        cloudflare: {
            env: {
                CF_TRACKER_SCRIPT_NAME: customScriptName,
            },
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
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
            const mockTrackerContent = "console.log('tracker script');";
            (global.fetch as any).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockTrackerContent),
            });

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe(mockTrackerContent);
            expect(response.headers.get("Content-Type")).toBe(
                "application/javascript",
            );
            expect(global.fetch).toHaveBeenCalledWith(
                "https://example.com/tracker.js",
            );
        });

        it("should serve custom script name when env variable is set", async () => {
            const mockTrackerContent = "console.log('custom script');";
            (global.fetch as any).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockTrackerContent),
            });

            const response = await loader({
                params: { script: "analytics.js" },
                context: createMockContext("analytics"),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe(mockTrackerContent);
            expect(response.headers.get("Content-Type")).toBe(
                "application/javascript",
            );
            expect(global.fetch).toHaveBeenCalledWith(
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
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
            });

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error serving script");
        });

        it("should handle network errors", async () => {
            (global.fetch as any).mockRejectedValue(new Error("Network error"));

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error serving script");
        });

        it("should set correct headers", async () => {
            const mockTrackerContent = "console.log('tracker script');";
            (global.fetch as any).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockTrackerContent),
            });

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.headers.get("Content-Type")).toBe(
                "application/javascript",
            );
            expect(response.headers.get("Cache-Control")).toBe(
                "public, max-age=3600",
            );
            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
            expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
                "GET",
            );
        });
    });
});
