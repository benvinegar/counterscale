// @vitest-environment jsdom
import { json } from "@remix-run/node";
import {
    vi,
    test,
    describe,
    beforeAll,
    beforeEach,
    afterEach,
    expect,
    Mock,
} from "vitest";
import "vitest-dom/extend-expect";

import { createRemixStub } from "@remix-run/testing";
import { render, screen, waitFor } from "@testing-library/react";

import Dashboard, { loader } from "./dashboard";
import { AnalyticsEngineAPI } from "~/analytics/query";

function createFetchResponse<T>(data: T) {
    return {
        ok: true,
        json: () => new Promise<T>((resolve) => resolve(data)),
    };
}

describe("Dashboard route", () => {
    let fetch: Mock;

    beforeAll(() => {
        // polyfill needed for recharts (used by TimeSeriesChart)
        global.ResizeObserver = require("resize-observer-polyfill");
    });

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("throws an exception if no Cloudflare credentials are provided", async () => {
            // empty strings
            await expect(
                loader({
                    context: {
                        analyticsEngine: new AnalyticsEngineAPI(
                            "testAccountId",
                            "testApiToken",
                        ),
                        env: {
                            VERSION: "",
                            CF_BEARER_TOKEN: "",
                            CF_ACCOUNT_ID: "",
                        },
                    },
                    // @ts-expect-error we don't need to provide all the properties of the request object
                    request: {
                        url: "http://localhost:3000/dashboard",
                    },
                }),
            ).rejects.toThrow("Missing Cloudflare credentials");
        });

        test("redirects to ?site=siteId if no siteId is provided via query string", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ siteId: "test-siteid", count: 1 }],
                }),
            );

            const response = await loader({
                context: {
                    analyticsEngine: new AnalyticsEngineAPI(
                        "testAccountId",
                        "testApiToken",
                    ),
                    env: {
                        VERSION: "",
                        CF_BEARER_TOKEN: "fake",
                        CF_ACCOUNT_ID: "fake",
                    },
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard", // no site query param
                },
            });

            // expect redirect
            expect(response.status).toBe(302);
            expect(response.headers.get("Location")).toBe(
                "http://localhost:3000/dashboard?site=test-siteid",
            );
        });

        test("redirects to ?site= if no siteId is provided via query string / no site data", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [],
                }),
            );

            const response = await loader({
                context: {
                    analyticsEngine: new AnalyticsEngineAPI(
                        "testAccountId",
                        "testApiToken",
                    ),
                    env: {
                        VERSION: "",
                        CF_BEARER_TOKEN: "fake",
                        CF_ACCOUNT_ID: "fake",
                    },
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard", // no site query param
                },
            });

            // expect redirect
            expect(response.status).toBe(302);
            expect(response.headers.get("Location")).toBe(
                "http://localhost:3000/dashboard?site=",
            );
        });

        test("assembles data returned from CF API", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ siteId: "test-siteid", count: 1 }],
                }),
            );

            // response for get counts
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { isVisit: 1, isVisitor: 1, count: 1 },
                        { isVisit: 1, isVisitor: 0, count: 2 },
                        { isVisit: 0, isVisitor: 0, count: 3 },
                    ],
                }),
            );

            // response for getCountByPath
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob3: "/", count: 1, isVisitor: 1, isVisit: 1 },
                        { blob3: "/", count: 3, isVisitor: 0, isVisit: 0 },
                    ],
                }),
            );

            // response for getCountByCountry
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ blob4: "US", count: 1 }],
                }),
            );

            // response for getCountByReferrer
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ blob5: "google.com", count: 1 }],
                }),
            );

            // response for getCountByBrowser
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ blob6: "Chrome", count: 2 }],
                }),
            );

            // response for getCountByDevice
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ blob7: "Desktop", count: 3 }],
                }),
            );

            // response for getViewsGroupedByInterval
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ bucket: "2024-01-11 05:00:00", count: 4 }],
                }),
            );

            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            const response = await loader({
                context: {
                    analyticsEngine: new AnalyticsEngineAPI(
                        "testAccountId",
                        "testApiToken",
                    ),
                    env: {
                        VERSION: "",
                        CF_BEARER_TOKEN: "fake",
                        CF_ACCOUNT_ID: "fake",
                    },
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard?site=test-siteid",
                },
            });

            const json = await response.json();

            expect(json).toEqual({
                siteId: "test-siteid",
                sites: ["test-siteid"],
                views: 6,
                visits: 3,
                visitors: 1,
                countByPath: [["/", 1, 4]],
                countByCountry: [["United States", 1]],
                countByReferrer: [["google.com", 1]],
                countByBrowser: [["Chrome", 2]],
                countByDevice: [["Desktop", 3]],
                viewsGroupedByInterval: [
                    ["2024-01-11 05:00:00", 4],
                    ["2024-01-12 05:00:00", 0],
                    ["2024-01-13 05:00:00", 0],
                    ["2024-01-14 05:00:00", 0],
                    ["2024-01-15 05:00:00", 0],
                    ["2024-01-16 05:00:00", 0],
                    ["2024-01-17 05:00:00", 0],
                    ["2024-01-18 05:00:00", 0],
                ],
                intervalType: "DAY",
                interval: "7d",
            });
        });

        test("returns a valid empty result set when no data (no sites, no anything)", async () => {
            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getSitesOrderedByHits
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // get counts
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getCountByPath
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getCountByCountry
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getCountByReferrer
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getCountByBrowser
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getCountByDevice
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getViewsGroupedByInterval

            const response = await loader({
                context: {
                    analyticsEngine: new AnalyticsEngineAPI(
                        "testAccountId",
                        "testApiToken",
                    ),
                    env: {
                        VERSION: "",
                        CF_BEARER_TOKEN: "fake",
                        CF_ACCOUNT_ID: "fake",
                    },
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard?site=", // intentionally empty
                },
            });

            const json = await response.json();

            expect(json).toEqual({
                siteId: "",
                sites: [],
                views: 0,
                visits: 0,
                visitors: 0,
                countByPath: [],
                countByCountry: [],
                countByReferrer: [],
                countByBrowser: [],
                countByDevice: [],
                viewsGroupedByInterval: [
                    ["2024-01-11 05:00:00", 0],
                    ["2024-01-12 05:00:00", 0],
                    ["2024-01-13 05:00:00", 0],
                    ["2024-01-14 05:00:00", 0],
                    ["2024-01-15 05:00:00", 0],
                    ["2024-01-16 05:00:00", 0],
                    ["2024-01-17 05:00:00", 0],
                    ["2024-01-18 05:00:00", 0],
                ],
                intervalType: "DAY",
                interval: "7d",
            });
        });
    });

    test("renders when no data", async () => {
        function loader() {
            return json({
                siteId: "@unknown",
                sites: [],
                views: [],
                visits: [],
                visitors: [],
                viewsGroupedByInterval: [],
                intervalType: "day",
            });
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader,
                children: [
                    {
                        path: "/resources/paths",
                        loader: () => {
                            return json({ countsByProperty: [] });
                        },
                    },
                    {
                        path: "/resources/referrer",
                        loader: () => {
                            return json({ countsByProperty: [] });
                        },
                    },
                    {
                        path: "/resources/browser",
                        loader: () => {
                            return json({ countsByProperty: [] });
                        },
                    },
                    {
                        path: "/resources/country",
                        loader: () => {
                            return json({ countsByProperty: [] });
                        },
                    },
                    {
                        path: "/resources/device",
                        loader: () => {
                            return json({ countsByProperty: [] });
                        },
                    },
                ],
            },
        ]);

        render(<RemixStub />);

        screen.logTestingPlaygroundURL();
        await waitFor(() => screen.findByText("Path"));
        expect(screen.getByText("Path")).toBeInTheDocument();
        expect(screen.getByText("Referrer")).toBeInTheDocument();
        expect(screen.getByText("Browser")).toBeInTheDocument();
        expect(screen.getByText("Country")).toBeInTheDocument();
        expect(screen.getByText("Device")).toBeInTheDocument();
    });

    const defaultMockedLoaderJson = {
        siteId: "example",
        sites: ["example"],
        views: 2133,
        visits: 80,
        visitors: 33,
        viewsGroupedByInterval: [
            ["2024-01-11 05:00:00", 0],
            ["2024-01-12 05:00:00", 0],
            ["2024-01-13 05:00:00", 3],
            ["2024-01-14 05:00:00", 0],
            ["2024-01-15 05:00:00", 0],
            ["2024-01-16 05:00:00", 2],
            ["2024-01-17 05:00:00", 1],
            ["2024-01-18 05:00:00", 0],
        ],
        intervalType: "day",
    };

    test("renders with valid data", async () => {
        function loader() {
            return json({ ...defaultMockedLoaderJson });
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader,
            },
        ]);

        render(<RemixStub />);

        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Visitors"));

        // assert some of the data we mocked actually rendered into the document
        expect(screen.getByText("2.1K")).toBeInTheDocument(); // view count
        expect(screen.getByText("33")).toBeInTheDocument(); // visitor count

        // expect(screen.getByText("/about")).toBeInTheDocument();
        // expect(screen.getByText("Chrome")).toBeInTheDocument();
        // expect(screen.getByText("google.com")).toBeInTheDocument();
        // expect(screen.getByText("Canada")).toBeInTheDocument(); // assert converted CA -> Canada
        // expect(screen.getByText("Mobile")).toBeInTheDocument();
    });
});
