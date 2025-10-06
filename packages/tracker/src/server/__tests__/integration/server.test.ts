import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Counterscale from "../../index";

describe("Server Integration Tests", () => {
    const mockFetch = vi.fn();
    const collectUrl = "https://analytics.example.com/collect";

    beforeEach(() => {
        vi.stubGlobal("fetch", mockFetch);
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
        });

        Counterscale.cleanup();
    });

    describe("Express.js Middleware Pattern", () => {
        beforeEach(() => {
            Counterscale.init({
                siteId: "express-middleware-test",
                reporterUrl: collectUrl,
            });
        });

        it("should track typical Express.js request data", async () => {
            // Simulate Express.js req/res objects
            const mockRequests = [
                {
                    originalUrl: "/",
                    host: "myapp.com",
                    referer: "https://google.com/search?q=my+app",
                },
                {
                    originalUrl: "/about?tab=team",
                    host: "myapp.com",
                    referer: "https://myapp.com/", // Same host, should filter
                },
                {
                    originalUrl: "/products/shoes?color=red&size=10",
                    host: "myapp.com",
                    referer: "https://facebook.com/ads",
                },
                {
                    originalUrl: "/contact",
                    host: "myapp.com",
                    referer: undefined, // No referrer
                },
            ];

            // Track each request as Express middleware would
            for (const req of mockRequests) {
                await Counterscale.trackPageview({
                    url: req.originalUrl,
                    hostname: req.host,
                    referrer: req.referer,
                });
            }

            expect(mockFetch).toHaveBeenCalledTimes(4);

            // Verify first request (from Google)
            const firstCall = new URL(mockFetch.mock.calls[0][0]);
            expect(firstCall.searchParams.get("p")).toBe("/");
            expect(firstCall.searchParams.get("r")).toBe(
                "https://google.com/search",
            );

            // Verify second request (same-host referrer filtered)
            const secondCall = new URL(mockFetch.mock.calls[1][0]);
            expect(secondCall.searchParams.get("p")).toBe("/about");
            expect(secondCall.searchParams.get("r")).toBeNull(); // Empty referrers filtered out

            // Verify third request (from Facebook)
            const thirdCall = new URL(mockFetch.mock.calls[2][0]);
            expect(thirdCall.searchParams.get("p")).toBe("/products/shoes");
            expect(thirdCall.searchParams.get("r")).toBe(
                "https://facebook.com/ads",
            );

            // Verify fourth request (no referrer)
            const fourthCall = new URL(mockFetch.mock.calls[3][0]);
            expect(fourthCall.searchParams.get("p")).toBe("/contact");
            expect(fourthCall.searchParams.get("r")).toBeNull();
        });

        it("should handle concurrent Express requests", async () => {
            const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
                url: `/page-${i}`,
                hostname: "concurrent-test.com",
                referrer: `https://source-${i % 3}.com`, // 3 different referrer sources
            }));

            // Fire all requests concurrently
            const trackingPromises = concurrentRequests.map((req) =>
                Counterscale.trackPageview(req),
            );

            await Promise.all(trackingPromises);

            expect(mockFetch).toHaveBeenCalledTimes(10);

            // Verify all pages were tracked
            const trackedPaths = mockFetch.mock.calls
                .map((call) => new URL(call[0]).searchParams.get("p"))
                .sort();
            const expectedPaths = Array.from(
                { length: 10 },
                (_, i) => `/page-${i}`,
            ).sort();
            expect(trackedPaths).toEqual(expectedPaths);
        });
    });

    describe("E-commerce Tracking Scenarios", () => {
        beforeEach(() => {
            Counterscale.init({
                siteId: "ecommerce-test",
                reporterUrl: collectUrl,
            });
        });

        it("should track product page views with UTM campaigns", async () => {
            const productViews = [
                {
                    url: "https://shop.example.com/products/running-shoes?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale",
                    referrer: "https://google.com/ads",
                },
                {
                    url: "https://shop.example.com/products/hiking-boots",
                    utmSource: "email",
                    utmMedium: "newsletter",
                    utmCampaign: "outdoor_gear",
                    referrer: "https://mailchimp.com",
                },
                {
                    url: "https://shop.example.com/products/sneakers?utm_source=facebook&utm_campaign=retargeting",
                    utmMedium: "social", // Override missing medium from URL
                    referrer: "https://facebook.com",
                },
            ];

            for (const view of productViews) {
                await Counterscale.trackPageview(view);
            }

            expect(mockFetch).toHaveBeenCalledTimes(3);

            // First product: UTM from URL
            const firstCall = new URL(mockFetch.mock.calls[0][0]);
            expect(firstCall.searchParams.get("us")).toBe("google");
            expect(firstCall.searchParams.get("um")).toBe("cpc");
            expect(firstCall.searchParams.get("uc")).toBe("summer_sale");

            // Second product: UTM from options
            const secondCall = new URL(mockFetch.mock.calls[1][0]);
            expect(secondCall.searchParams.get("us")).toBe("email");
            expect(secondCall.searchParams.get("um")).toBe("newsletter");
            expect(secondCall.searchParams.get("uc")).toBe("outdoor_gear");

            // Third product: Mixed UTM (URL + options)
            const thirdCall = new URL(mockFetch.mock.calls[2][0]);
            expect(thirdCall.searchParams.get("us")).toBe("facebook");
            expect(thirdCall.searchParams.get("um")).toBe("social"); // Overridden
            expect(thirdCall.searchParams.get("uc")).toBe("retargeting");
        });

        it("should track checkout funnel pages", async () => {
            const checkoutFunnel = [
                "/cart",
                "/checkout/shipping",
                "/checkout/payment",
                "/checkout/review",
                "/checkout/confirmation",
            ];

            for (let i = 0; i < checkoutFunnel.length; i++) {
                const previousPage =
                    i > 0
                        ? `https://shop.example.com${checkoutFunnel[i - 1]}`
                        : "https://google.com/products/search"; // External referrer

                await Counterscale.trackPageview({
                    url: checkoutFunnel[i],
                    hostname: "shop.example.com",
                    referrer: previousPage,
                });
            }

            expect(mockFetch).toHaveBeenCalledTimes(5);

            // Verify funnel sequence
            const funnelPaths = mockFetch.mock.calls.map((call) =>
                new URL(call[0]).searchParams.get("p"),
            );
            expect(funnelPaths).toEqual(checkoutFunnel);

            // First step should have external referrer
            const firstCall = new URL(mockFetch.mock.calls[0][0]);
            expect(firstCall.searchParams.get("r")).toBe(
                "https://google.com/products/search",
            );

            // Subsequent steps should have filtered referrers (same hostname)
            for (let i = 1; i < 5; i++) {
                const call = new URL(mockFetch.mock.calls[i][0]);
                expect(call.searchParams.get("r")).toBeNull(); // Same host filtered (and empty params removed)
            }
        });
    });

    describe("Multi-site Tracking", () => {
        it("should handle multiple site IDs with different configurations", async () => {
            // Track for main site
            Counterscale.init({
                siteId: "main-site",
                reporterUrl: collectUrl,
                reportOnLocalhost: false,
            });

            await Counterscale.trackPageview({
                url: "https://main.example.com/home",
                referrer: "https://google.com",
            });

            // Reinitialize for blog subdomain (different config)
            Counterscale.cleanup();
            Counterscale.init({
                siteId: "blog-site",
                reporterUrl: collectUrl,
                reportOnLocalhost: true, // Different setting
                timeout: 5000,
            });

            await Counterscale.trackPageview({
                url: "https://blog.example.com/post/hello-world",
                referrer: "https://twitter.com",
            });

            expect(mockFetch).toHaveBeenCalledTimes(2);

            const firstCall = new URL(mockFetch.mock.calls[0][0]);
            expect(firstCall.searchParams.get("sid")).toBe("main-site");
            expect(firstCall.searchParams.get("h")).toBe(
                "https://main.example.com",
            );
            expect(firstCall.searchParams.get("p")).toBe("/home");

            const secondCall = new URL(mockFetch.mock.calls[1][0]);
            expect(secondCall.searchParams.get("sid")).toBe("blog-site");
            expect(secondCall.searchParams.get("h")).toBe(
                "https://blog.example.com",
            );
            expect(secondCall.searchParams.get("p")).toBe("/post/hello-world");
        });
    });

    describe("Error Resilience", () => {
        beforeEach(() => {
            Counterscale.init({
                siteId: "error-test",
                reporterUrl: collectUrl,
                timeout: 1000,
            });
        });

        it("should handle network failures gracefully (fire-and-forget)", async () => {
            // Mock fetch to fail
            mockFetch.mockRejectedValue(new Error("Network error"));

            // Should not throw - tracking is fire-and-forget
            await expect(
                Counterscale.trackPageview({
                    url: "https://example.com/test",
                }),
            ).resolves.toBeUndefined();

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("should continue working after failed requests", async () => {
            // First request fails
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            try {
                await Counterscale.trackPageview({
                    url: "https://example.com/fail",
                });
            } catch {
                // Expected to fail
            }

            // Second request should work
            mockFetch.mockResolvedValue({ ok: true, status: 200 });

            await Counterscale.trackPageview({
                url: "https://example.com/success",
            });

            expect(mockFetch).toHaveBeenCalledTimes(2);

            const secondCall = new URL(mockFetch.mock.calls[1][0]);
            expect(secondCall.searchParams.get("p")).toBe("/success");
        });
    });

    describe("Performance with High Volume", () => {
        beforeEach(() => {
            Counterscale.init({
                siteId: "performance-test",
                reporterUrl: collectUrl,
            });
        });

        it("should handle high-volume concurrent tracking", async () => {
            const numRequests = 50;
            const requests = Array.from({ length: numRequests }, (_, i) => ({
                url: `https://example.com/page-${i}`,
                referrer: i % 10 === 0 ? "https://google.com" : undefined,
                utmSource: i % 5 === 0 ? "campaign" : undefined,
            }));

            const startTime = Date.now();

            // Fire all requests concurrently
            const promises = requests.map(
                (req) => Counterscale.trackPageview(req).catch(() => {}), // Ignore individual failures
            );

            await Promise.all(promises);

            const duration = Date.now() - startTime;

            expect(mockFetch).toHaveBeenCalledTimes(numRequests);
            expect(duration).toBeLessThan(1000); // Should complete very fast with mocked fetch

            // Verify all unique pages were tracked
            const trackedPaths = new Set(
                mockFetch.mock.calls.map((call) =>
                    new URL(call[0]).searchParams.get("p"),
                ),
            );
            expect(trackedPaths.size).toBe(numRequests);
        });
    });
});
