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
        // The tracker script is served with a wildcard ACAO regardless of
        // Origin or the allowlist: CORS can't gate who loads a script, and a
        // wildcard keeps SRI (crossorigin="anonymous") working without
        // fragmenting the CDN cache. Origin enforcement lives in /collect.
        it("is '*' when no Origin header is present", async () => {
            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(),
                request: buildMockRequest(),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
            expect(response.headers.get("Vary")).toBeNull();
        });

        it("is '*' even when an allowlist is configured and Origin matches", async () => {
            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(
                    undefined,
                    "https://foo.com, https://bar.com",
                ),
                request: buildMockRequest("https://bar.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
            expect(response.headers.get("Vary")).toBeNull();
        });

        it("is '*' for an Origin not in the allowlist", async () => {
            const response = await loader({
                params: { script: "tracker.js" },
                context: createMockContext(undefined, "shiftinbits.com"),
                request: buildMockRequest("https://evil.com"),
            } as any);

            expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
                "*",
            );
        });
    });
});
