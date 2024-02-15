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
                    data: [{ blob3: "/", count: 1 }],
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
                    data: [{ bucket: "2024-01-11 00:00:00", count: 4 }],
                }),
            );

            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            const response = await loader({
                context: {
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
                countByPath: [["/", 1]],
                countByCountry: [["US", 1]],
                countByReferrer: [["google.com", 1]],
                countByBrowser: [["Chrome", 2]],
                countByDevice: [["Desktop", 3]],
                viewsGroupedByInterval: [
                    ["2024-01-11 00:00:00", 4],
                    ["2024-01-12 00:00:00", 0],
                    ["2024-01-13 00:00:00", 0],
                    ["2024-01-14 00:00:00", 0],
                    ["2024-01-15 00:00:00", 0],
                    ["2024-01-16 00:00:00", 0],
                    ["2024-01-17 00:00:00", 0],
                    ["2024-01-18 00:00:00", 0],
                ],
                intervalType: "DAY",
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
                    ["2024-01-11 00:00:00", 0],
                    ["2024-01-12 00:00:00", 0],
                    ["2024-01-13 00:00:00", 0],
                    ["2024-01-14 00:00:00", 0],
                    ["2024-01-15 00:00:00", 0],
                    ["2024-01-16 00:00:00", 0],
                    ["2024-01-17 00:00:00", 0],
                    ["2024-01-18 00:00:00", 0],
                ],
                intervalType: "DAY",
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
                countByPath: [],
                countByBrowser: [],
                countByCountry: [],
                countByReferrer: [],
                countByDevice: [],
                viewsGroupedByInterval: [],
                intervalType: "day",
            });
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
        await waitFor(() => screen.findByText("Country"));
        expect(screen.getByText("Country")).toBeInTheDocument();
    });

    const defaultMockedLoaderJson = {
        siteId: "example",
        sites: ["example"],
        views: 100,
        visits: 80,
        visitors: 33,
        countByPath: [
            ["/", 100],
            ["/about", 80],
            ["/contact", 60],
        ],
        countByBrowser: [
            ["Chrome", 100],
            ["Safari", 80],
            ["Firefox", 60],
        ],
        countByCountry: [
            ["US", 100],
            ["CA", 80],
            ["UK", 60],
        ],
        countByReferrer: [
            ["google.com", 100],
            ["facebook.com", 80],
            ["twitter.com", 60],
        ],
        countByDevice: [
            ["Desktop", 100],
            ["Mobile", 80],
            ["Tablet", 60],
        ],
        viewsGroupedByInterval: [
            ["2024-01-11 00:00:00", 0],
            ["2024-01-12 00:00:00", 0],
            ["2024-01-13 00:00:00", 3],
            ["2024-01-14 00:00:00", 0],
            ["2024-01-15 00:00:00", 0],
            ["2024-01-16 00:00:00", 2],
            ["2024-01-17 00:00:00", 1],
            ["2024-01-18 00:00:00", 0],
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
        await waitFor(() => screen.findByText("Chrome"));

        // assert some of the data we mocked actually rendered into the document
        expect(screen.getByText("33")).toBeInTheDocument();
        expect(screen.getByText("/about")).toBeInTheDocument();
        expect(screen.getByText("Chrome")).toBeInTheDocument();
        expect(screen.getByText("google.com")).toBeInTheDocument();
        expect(screen.getByText("Canada")).toBeInTheDocument(); // assert converted CA -> Canada
        expect(screen.getByText("Mobile")).toBeInTheDocument();
    });

    test("renders with invalid country code", async () => {
        function loader() {
            return json({
                ...defaultMockedLoaderJson,
                countByCountry: [
                    ["US", 100],
                    ["CA", 80],
                    ["not_a_valid_country_code", 60],
                ],
            });
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
        await waitFor(() => screen.findByText("Chrome"));

        // assert the invalid country code was converted to "(unknown)"
        expect(screen.getByText("(unknown)")).toBeInTheDocument();
    });
});
