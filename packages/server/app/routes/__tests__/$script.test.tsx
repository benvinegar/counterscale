import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "../$script";

describe("Dynamic script route", () => {
    const buildMockRequest = (origin?: string): Request =>
        ({
            url: "https://example.com/analytics.js",
            headers: new Headers(origin ? { Origin: origin } : {}),
        }) as Request;

    const mockRequest = buildMockRequest();

    const mockAssetsFetch = vi.fn();

    const createMockContext = (
        customScriptName?: string,
        allowedOrigins?: string,
    ) => ({
        cloudflare: {
            env: {
                CF_TRACKER_SCRIPT_NAME: customScriptName,
                TRACKER_ALLOWED_ORIGINS: allowedOrigins,
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

            expect(response.status).toBe(200);
            expect(response.headers.get("Cache-Control")).toBe(
                "public, max-age=3600",
            );
            expect(await response.text()).toBe(
                "console.log('tracker script');",
            );
            expect(mockAssetsFetch).toHaveBeenCalledWith(
                "https://example.com/tracker.js",
            );
        });
    });

    describe("Access-Control-Allow-Origin header", () => {
        const buildAssetResponse = () =>
            new Response("console.log('tracker');", {
                status: 200,
                headers: { "Content-Type": "application/javascript" },
            });

        it("defaults to '*' when TRACKER_ALLOWED_ORIGINS is missing", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: buildMockRequest("https://anything.example"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
            expect(response.headers.get("Vary")).toBeNull();
        });

        it("defaults to '*' when TRACKER_ALLOWED_ORIGINS is empty", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(undefined, "   "),
                request: buildMockRequest("https://anything.example"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
        });

        it("echoes a matching Origin and sets Vary: Origin", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(
                    undefined,
                    "https://foo.com, https://bar.com",
                ),
                request: buildMockRequest("https://bar.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "https://bar.com",
            );
            expect(response.headers.get("Vary")).toBe("Origin");
        });

        it("matches subdomains of listed bare hosts", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(undefined, "shiftinbits.com"),
                request: buildMockRequest("https://test.shiftinbits.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "https://test.shiftinbits.com",
            );
        });

        it("matches subdomains of listed origins", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(
                    undefined,
                    "https://shiftinbits.com",
                ),
                request: buildMockRequest("https://a.b.shiftinbits.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "https://a.b.shiftinbits.com",
            );
        });

        it("does not treat sibling domains as subdomains", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(
                    undefined,
                    "https://foo.com, https://bar.com",
                ),
                request: buildMockRequest("https://evil-foo.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "https://foo.com",
            );
        });

        it("falls back to first allowed origin when Origin is missing", async () => {
            mockAssetsFetch.mockResolvedValue(buildAssetResponse());

            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(
                    undefined,
                    "https://foo.com, https://bar.com",
                ),
                request: buildMockRequest(),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "https://foo.com",
            );
        });
    });
});
