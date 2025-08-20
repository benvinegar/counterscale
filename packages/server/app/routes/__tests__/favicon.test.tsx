// @vitest-environment jsdom
import { vi, test, describe, beforeEach, afterEach, expect } from "vitest";
import "vitest-dom/extend-expect";

import { loader } from "../favicon";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCache = {
    match: vi.fn(),
    put: vi.fn(),
};

const mockCaches = {
    default: mockCache,
};

Object.defineProperty(global, "caches", {
    value: mockCaches,
    writable: true,
});

describe("Favicon route", () => {
    const mockContext = {
        cloudflare: {
            caches: mockCaches,
            ctx: {
                waitUntil: vi.fn(),
            },
        },
        analyticsEngine: {},
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockCache.match.mockResolvedValue(null);
        mockCache.put.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("loader", () => {
        test("returns 400 when url parameter is missing", async () => {
            const request = new Request("http://localhost:3000/favicon");

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe("Missing url parameter");
        });

        test("fetches favicon from Google service when not cached", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            // Mock successful favicon response
            const mockFaviconResponse = new Response("fake-favicon-data", {
                status: 200,
                headers: {
                    "Content-Type": "image/x-icon",
                },
            });
            mockFetch.mockResolvedValue(mockFaviconResponse);

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("image/x-icon");
            expect(response.headers.get("Cache-Control")).toBe(
                "public, max-age=86400",
            );
            expect(response.headers.get("CDN-Cache-Control")).toBe(
                "public, max-age=2592000",
            );

            expect(mockFetch).toHaveBeenCalledWith(
                `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(faviconUrl)}&size=128`,
            );

            expect(mockContext.cloudflare.ctx.waitUntil).toHaveBeenCalled();
        });

        test("returns cached response when available", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            const cachedResponse = new Response("cached-favicon-data", {
                status: 200,
                headers: {
                    "Content-Type": "image/x-icon",
                },
            });
            mockCache.match.mockResolvedValue(cachedResponse);

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response).toBe(cachedResponse);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test("returns 404 when Google favicon service returns 404", async () => {
            const faviconUrl = "https://nonexistent.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            mockFetch.mockResolvedValue(
                new Response("Not Found", { status: 404 }),
            );

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe("Favicon not found");
        });

        test("handles invalid URL parameter gracefully", async () => {
            const invalidUrl = "not-a-valid-url";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(invalidUrl)}`,
            );

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error fetching favicon");
        });

        test("handles fetch errors gracefully", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            mockFetch.mockRejectedValue(new Error("Network error"));

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error fetching favicon");
        });

        test("handles missing Content-Type header from Google service", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            // Mock response with null Content-Type header
            const mockFaviconResponse = new Response("fake-favicon-data", {
                status: 200,
                headers: new Headers(),
            });
            // Simulate Google service not providing Content-Type
            mockFaviconResponse.headers.get = vi.fn().mockReturnValue(null);
            mockFetch.mockResolvedValue(mockFaviconResponse);

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("image/x-icon");
        });

        test("handles cache errors gracefully", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            // Mock cache error - this will cause the entire try block to fail
            mockCache.match.mockRejectedValue(new Error("Cache error"));

            const response = await loader({
                request,
                context: mockContext,
            } as any);

            // Cache errors cause the entire function to fail, so we get 500
            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error fetching favicon");
        });

        test("handles missing cloudflare context gracefully", async () => {
            const faviconUrl = "https://example.com";
            const request = new Request(
                `http://localhost:3000/favicon?url=${encodeURIComponent(faviconUrl)}`,
            );

            const minimalContext = {
                cloudflare: {
                    caches: mockCaches,
                    // Missing ctx.waitUntil will cause an error
                },
                analyticsEngine: {},
            };

            // Mock successful favicon response
            mockFetch.mockResolvedValue(
                new Response("fake-favicon-data", {
                    status: 200,
                    headers: { "Content-Type": "image/x-icon" },
                }),
            );

            const response = await loader({
                request,
                context: minimalContext,
            } as any);

            // Missing waitUntil causes the function to fail when trying to access it
            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error fetching favicon");
        });
    });
});
