import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { trackPageview } from "../track";
import * as requestModule from "../request";
import { Client } from "../client";

describe("trackPageview", () => {
    // Mock the makeRequest function
    const makeRequestMock = vi.fn();

    beforeEach(() => {
        // Mock the makeRequest function
        vi.spyOn(requestModule, "makeRequest").mockImplementation(
            makeRequestMock,
        );

        // Mock the checkCacheStatus function to return a default response
        vi.spyOn(requestModule, "checkCacheStatus").mockImplementation(() => {
            return Promise.resolve({
                ht: 1, // First hit (new visit)
            });
        });

        // Reset mocks between tests
        makeRequestMock.mockReset();

        // Mock window.location
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                pathname: "/test-path",
                search: "?test=true",
                host: "example.com",
            },
        });

        // Mock navigator.userAgent
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        });

        // Mock document.referrer
        Object.defineProperty(document, "referrer", {
            writable: true,
            value: "",
        });

        // Mock document.querySelector for canonical URL
        vi.spyOn(document, "querySelector").mockReturnValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("should make a request when host is not empty", async () => {
        const client = new Client({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
        });

        await trackPageview(client);

        expect(makeRequestMock).toHaveBeenCalledTimes(1);
        expect(makeRequestMock).toHaveBeenCalledWith(
            "https://example.com/collect",
            expect.objectContaining({
                p: "/test-path",
                h: "http://localhost",
                r: "",
                sid: "test-site",
                ht: "1", // First hit (new visit)
            }),
        );
    });

    test("should exit early when host is empty and not in Electron", async () => {
        // Mock empty host (file:/// URI)
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                pathname: "/test-path",
                search: "?test=true",
                host: "",
            },
        });

        // Mock non-Electron user agent
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        });

        const client = new Client({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
        });

        await trackPageview(client);

        // Verify that makeRequest was not called
        expect(makeRequestMock).not.toHaveBeenCalled();
    });

    test("should make a request when host is empty but in Electron", async () => {
        // Mock empty host (file:/// URI)
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                pathname: "/test-path",
                search: "?test=true",
                host: "",
            },
        });

        // Mock Electron user agent
        Object.defineProperty(navigator, "userAgent", {
            writable: true,
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Electron/15.0.0",
        });

        const client = new Client({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
        });

        await trackPageview(client);

        // Verify that makeRequest was called
        expect(makeRequestMock).toHaveBeenCalledTimes(1);
    });

    test("should not make a request on localhost when reportOnLocalhost is false", async () => {
        // Mock localhost hostname
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                pathname: "/test-path",
                search: "?test=true",
                host: "localhost:3000",
                hostname: "localhost",
            },
        });

        const client = new Client({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
            reportOnLocalhost: false,
        });

        await trackPageview(client);

        // Verify that makeRequest was not called
        expect(makeRequestMock).not.toHaveBeenCalled();
    });

    test("should make a request on localhost when reportOnLocalhost is true", async () => {
        // Mock localhost hostname
        Object.defineProperty(window, "location", {
            writable: true,
            value: {
                pathname: "/test-path",
                search: "?test=true",
                host: "localhost:3000",
                hostname: "localhost",
            },
        });

        const client = new Client({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
            reportOnLocalhost: true,
        });

        await trackPageview(client);

        // Verify that makeRequest was called
        expect(makeRequestMock).toHaveBeenCalledTimes(1);
    });

    describe("localhost detection", () => {
        test.each([
            "localhost",
            "127.0.0.1",
            "127.1",
            "127.0.1",
            "::1",
            "0:0:0:0:0:0:0:1",
        ])(
            "should not track on %s when reportOnLocalhost is false",
            async (hostname) => {
                // Mock localhost-like hostname
                Object.defineProperty(window, "location", {
                    writable: true,
                    value: {
                        pathname: "/test-path",
                        search: "?test=true",
                        host: hostname,
                        hostname: hostname,
                    },
                });

                const client = new Client({
                    siteId: "test-site",
                    reporterUrl: "https://example.com/collect",
                    autoTrackPageviews: false,
                    reportOnLocalhost: false,
                });

                await trackPageview(client);

                expect(makeRequestMock).not.toHaveBeenCalled();
            },
        );

        test.each([
            "localhost",
            "127.0.0.1",
            "127.1",
            "127.0.1",
            "::1",
            "0:0:0:0:0:0:0:1",
        ])(
            "should track on %s when reportOnLocalhost is true",
            async (hostname) => {
                // Mock localhost-like hostname
                Object.defineProperty(window, "location", {
                    writable: true,
                    value: {
                        pathname: "/test-path",
                        search: "?test=true",
                        host: hostname,
                        hostname: hostname,
                    },
                });

                const client = new Client({
                    siteId: "test-site",
                    reporterUrl: "https://example.com/collect",
                    autoTrackPageviews: false,
                    reportOnLocalhost: true,
                });

                await trackPageview(client);

                expect(makeRequestMock).toHaveBeenCalledTimes(1);
            },
        );
    });
});
