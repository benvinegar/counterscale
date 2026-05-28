import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../tracker/tracker.js?raw", () => ({
    default: "console.log('tracker script');",
}));

import { loader } from "../$script";

describe("Dynamic script route", () => {
    const buildMockRequest = (origin?: string): Request =>
        ({
            url: "https://example.com/analytics.js",
            headers: new Headers(origin ? { Origin: origin } : {}),
        }) as Request;

    const mockRequest = buildMockRequest();

    const createMockContext = (
        customScriptName?: string,
        allowedOrigins?: string,
    ) => ({
        cloudflare: {
            env: {
                CF_TRACKER_SCRIPT_NAME: customScriptName,
                TRACKER_ALLOWED_ORIGINS: allowedOrigins,
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

        it("should return 404 for unmatched script names", async () => {
            const response = await loader({
                params: { script: "unknown.js" },
                context: createMockContext("analytics"),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe("Script not found");
        });

        it("should serve the bundled tracker source for tracker.js", async () => {
            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe(
                "application/javascript; charset=utf-8",
            );
            expect(response.headers.get("Cache-Control")).toBe(
                "public, max-age=3600",
            );
            expect(await response.text()).toBe(
                "console.log('tracker script');",
            );
        });

        it("should serve the bundled source for a renamed tracker", async () => {
            const response = await loader({
                params: { script: "analytics.js" },
                context: createMockContext("analytics"),
                request: mockRequest,
            } as any);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe(
                "console.log('tracker script');",
            );
        });
    });

    describe("Access-Control-Allow-Origin header", () => {
        it("defaults to '*' when TRACKER_ALLOWED_ORIGINS is missing", async () => {
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
