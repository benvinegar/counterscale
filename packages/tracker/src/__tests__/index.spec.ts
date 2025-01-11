import {
    describe,
    test,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
    vi,
} from "vitest";

import * as Counterscale from "../index";

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

    afterEach(() => {
        Counterscale.cleanup();
    });

    test("initializes", () => {
        Counterscale.initialize({
            siteId: "test-id",
            reporterUrl: "https://example.com/collect",
        });
    });

    describe("trackPageview", () => {
        test("records a pageview for the current url", () => {
            Counterscale.initialize({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            Counterscale.trackPageview();

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
            Counterscale.initialize({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
            });

            // since auto: false, no requests should be made yet
            expect(mockXhrObjects).toHaveLength(0);

            Counterscale.trackPageview({
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
        test("records initial and subsequent pageviews", () => {
            Counterscale.initialize({
                siteId: "test-id",
                reporterUrl: "https://example.com/collect",
                autoTrackPageviews: true,
            });

            expect(mockXhrObjects).toHaveLength(1);

            let openArgs = mockXhrObjects[0].open.mock.calls[0];
            expect(openArgs[0]).toBe("GET");

            let queryString = openArgs[1];
            let searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("http://localhost");
            expect(searchParams.get("p")).toBe("/"); // default path when running test w/ jsdom
            expect(searchParams.get("r")).toBe("");

            window.history.pushState({ page: 2 }, "", "/foo");

            expect(mockXhrObjects).toHaveLength(2);

            openArgs = mockXhrObjects[1].open.mock.calls[0];
            queryString = openArgs[1];
            searchParams = new URL(queryString).searchParams;
            expect(searchParams.get("sid")).toBe("test-id");
            expect(searchParams.get("h")).toBe("http://localhost");
            expect(searchParams.get("p")).toBe("/foo");
            expect(searchParams.get("r")).toBe("");

            Counterscale.cleanup();
        });
    });
});
