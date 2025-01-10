import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest";

import Counterscale from "../index";

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
    });

    beforeEach(() => {
        mockXhrObjects = [];
    });

    test("initializes", () => {
        const counterscale = Counterscale({
            siteId: "test-id",
            reporterUrl: "https://example.com/collect",
        });

        expect(counterscale).toHaveProperty("trackPageview");
        expect(counterscale).toHaveProperty("cleanup");
    });

    describe("trackPageview", () => {
        test("records a pageview for the current url", () => {
            const { trackPageview } = Counterscale({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            trackPageview();

            expect(mockXhrObjects).toHaveLength(1);

            const openArgs = mockXhrObjects[0].open.mock.calls[0];
            expect(openArgs[0]).toBe("GET");

            const queryString = openArgs[1];
            const searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("http://localhost");
            expect(searchParams.get("p")).toBe("/"); // default path when running test w/ jsdom
            expect(searchParams.get("r")).toBe("");
        });

        test("records a pageview for the given url and referrer", () => {
            const { trackPageview } = Counterscale({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            trackPageview({
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
        });
    });

    describe("autoTrackPageviews", () => {
        test("records an initial pageview", () => {
            const { cleanup } = Counterscale({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
                autoTrackPageviews: true,
            });

            expect(mockXhrObjects).toHaveLength(1);

            const openArgs = mockXhrObjects[0].open.mock.calls[0];
            expect(openArgs[0]).toBe("GET");

            const queryString = openArgs[1];
            const searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("http://localhost");
            expect(searchParams.get("p")).toBe("/"); // default path when running test w/ jsdom
            expect(searchParams.get("r")).toBe("");

            cleanup();
        });
    });
});
