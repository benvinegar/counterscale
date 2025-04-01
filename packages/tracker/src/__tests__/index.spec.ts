import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";

import * as Counterscale from "../index";
import * as requestModule from "../lib/request";

describe("api", () => {
    let mockXhrObjects = [] as any;
    beforeAll(() => {
        const XMLHttpRequestMock = vi.fn(() => {
            const obj = {
                open: vi.fn(),
                send: vi.fn(),
                setRequestHeader: vi.fn(),
                addEventListener: vi.fn(),
                responseText: "",
                status: 200,
                statusText: "OK",
            };
            mockXhrObjects.push(obj);
            return obj;
        });

        vi.stubGlobal("XMLHttpRequest", XMLHttpRequestMock);
        
        // Mock the checkCacheStatus function to return a default response
        vi.spyOn(requestModule, "checkCacheStatus").mockImplementation(() => {
            return Promise.resolve({
                v: 1, // New visit
                b: 1, // Bounce
            });
        });
    });

    afterEach(() => {
        mockXhrObjects = [];
        Counterscale.cleanup();
    });

    test("initializes", () => {
        Counterscale.init({
            siteId: "test-id",
            reporterUrl: "https://example.com/collect",
            autoTrackPageviews: false,
        });
    });

    describe("trackPageview", () => {
        test("records a pageview for the current url", async () => {
            Counterscale.init({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
                autoTrackPageviews: false,
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            await Counterscale.trackPageview();

            expect(mockXhrObjects).toHaveLength(1);

            const openArgs = mockXhrObjects[0].open.mock.calls[0];
            expect(openArgs[0]).toBe("GET");

            const queryString = openArgs[1];
            const searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("http://localhost");
            expect(searchParams.get("p")).toBe("/"); // default path when running test w/ jsdom
            expect(searchParams.get("r")).toBe("");
            expect(searchParams.get("v")).toBe("1"); // New visit
            expect(searchParams.get("b")).toBe("1"); // Bounce
        });

        test("records a pageview for the given url and referrer", async () => {
            Counterscale.init({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
                autoTrackPageviews: false,
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            await Counterscale.trackPageview({
                url: "https://example.com/foo",
                referrer: "https://referrer.com/",
            });

            expect(mockXhrObjects).toHaveLength(1);

            const openArgs = mockXhrObjects[0].open.mock.calls[0];
            expect(openArgs[0]).toBe("GET");

            const queryString = openArgs[1];
            const searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("https://example.com");
            expect(searchParams.get("p")).toBe("/foo");
            expect(searchParams.get("r")).toBe("https://referrer.com/");
            expect(searchParams.get("v")).toBe("1"); // New visit
            expect(searchParams.get("b")).toBe("1"); // Bounce
        });
    });

    describe("autoTrackPageviews", () => {
        test("initializes with autoTrackPageviews", async () => {
            // Initialize with autoTrackPageviews: true
            Counterscale.init({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
                autoTrackPageviews: true,
            });
            
            // Wait for setTimeout in the Client constructor to execute
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check that at least one XHR request was made (initial pageview)
            expect(mockXhrObjects.length).toBeGreaterThan(0);
            
            // Trigger a navigation event
            window.dispatchEvent(new Event("popstate"));
            
            // Wait for the navigation event to be processed
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check that another XHR request was made (after navigation)
            const initialCount = mockXhrObjects.length;
            expect(initialCount).toBeGreaterThan(1);
            
            // Trigger another navigation event
            window.history.pushState({}, "", "/another-page");
            window.dispatchEvent(new Event("popstate"));
            
            // Wait for the second navigation event to be processed
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check that a third XHR request was made
            expect(mockXhrObjects.length).toBeGreaterThan(initialCount);
        });
    });
});
