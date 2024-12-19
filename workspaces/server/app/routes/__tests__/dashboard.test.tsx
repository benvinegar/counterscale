// @vitest-environment jsdom
import { LoaderFunctionArgs } from "@remix-run/node";
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

import Dashboard, { loader } from "../dashboard";
import { AnalyticsEngineAPI } from "~/analytics/query";
import { createFetchResponse, getDefaultContext } from "./testutils";

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
        test("throws a 501 Response if no Cloudflare credentials are provided", async () => {
            const mockLoaderParams: LoaderFunctionArgs = {
                context: {
                    analyticsEngine: new AnalyticsEngineAPI(
                        "testAccountId",
                        "testApiToken",
                    ),
                    cloudflare: {
                        // @ts-expect-error we don't need to provide all the properties of the cloudflare object
                        env: {
                            CF_ACCOUNT_ID: "",
                            CF_BEARER_TOKEN: "",
                        },
                    },
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard",
                },
            };

            try {
                await loader(mockLoaderParams);
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                const response = error as Response;
                expect(await response.text()).toBe(
                    "Missing credentials: CF_ACCOUNT_ID is not set.",
                );
                expect(response.status).toBe(501);
            }

            // run it again, this time with account ID present, but bearer token absent
            mockLoaderParams.context.cloudflare = {
                // @ts-expect-error we don't need to provide all the properties of the cloudflare object
                env: {
                    CF_ACCOUNT_ID: "testAccountId",
                    CF_BEARER_TOKEN: "",
                },
            };

            try {
                await loader(mockLoaderParams);
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                const response = error as Response;
                expect(await response.text()).toBe(
                    "Missing credentials: CF_BEARER_TOKEN is not set.",
                );
                expect(response.status).toBe(501);
            }
        });

        test("redirects to ?site=siteId if no siteId is provided via query string", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ siteId: "test-siteid", count: 1 }],
                }),
            );

            try {
                await loader({
                    ...getDefaultContext(),
                    // @ts-expect-error we don't need to provide all the properties of the request object
                    request: {
                        url: "http://localhost:3000/dashboard", // no site query param
                    },
                });
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                const response = error as Response;

                // expect redirect
                expect(response.status).toBe(302);
                expect(response.headers.get("Location")).toBe(
                    "http://localhost:3000/dashboard?site=test-siteid",
                );
            }
        });

        test("redirects to ?site= if no siteId is provided via query string / no site data", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [],
                }),
            );

            try {
                await loader({
                    ...getDefaultContext(),
                    // @ts-expect-error we don't need to provide all the properties of the request object
                    request: {
                        url: "http://localhost:3000/dashboard", // no site query param
                    },
                });
            } catch (error) {
                expect(error).toBeInstanceOf(Response);
                const response = error as Response;

                // expect redirect
                expect(response.status).toBe(302);
                expect(response.headers.get("Location")).toBe(
                    "http://localhost:3000/dashboard?site=",
                );
            }
        });

        test("assembles data returned from CF API", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [{ siteId: "test-siteid", count: 1 }],
                }),
            );

            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard?site=test-siteid",
                },
            });

            const json = await response;

            expect(json).toEqual({
                filters: {},
                siteId: "test-siteid",
                sites: ["test-siteid"],
                intervalType: "DAY",
                interval: "7d",
            });
        });

        test("returns a valid empty result set when no data (no sites, no anything)", async () => {
            vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());

            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getSitesOrderedByHits
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // get counts
            fetch.mockResolvedValueOnce(createFetchResponse({ data: [] })); // getViewsGroupedByInterval

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/dashboard?site=", // intentionally empty
                },
            });

            const json = await response;

            expect(json).toEqual({
                filters: {},
                siteId: "",
                sites: [],
                intervalType: "DAY",
                interval: "7d",
            });
        });
    });

    test("renders when no data", async () => {
        function loader() {
            return {
                siteId: "@unknown",
                sites: [],
                intervalType: "day",
            };
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader,
                children: [
                    {
                        path: "/resources/timeseries",
                        loader: () => {
                            return { chartData: [] };
                        },
                    },
                    {
                        path: "/resources/stats",
                        loader: () => {
                            return {
                                views: 0,
                                visitors: 0,
                            };
                        },
                    },
                    {
                        path: "/resources/paths",
                        loader: () => {
                            return { countsByProperty: [] };
                        },
                    },
                    {
                        path: "/resources/referrer",
                        loader: () => {
                            return { countsByProperty: [] };
                        },
                    },
                    {
                        path: "/resources/browser",
                        loader: () => {
                            return { countsByProperty: [] };
                        },
                    },
                    {
                        path: "/resources/country",
                        loader: () => {
                            return { countsByProperty: [] };
                        },
                    },
                    {
                        path: "/resources/device",
                        loader: () => {
                            return { countsByProperty: [] };
                        },
                    },
                ],
            },
        ]);

        render(<RemixStub />);

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
        filters: {
            path: "/lol",
        },
    };

    test("renders with valid data", async () => {
        function loader() {
            return { ...defaultMockedLoaderJson };
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader,
                children: [
                    {
                        path: "/resources/stats",
                        loader: () => {
                            return {
                                views: 2133,
                                visitors: 33,
                            };
                        },
                    },
                    {
                        path: "/resources/timeseries",
                        loader: () => {
                            return {};
                        },
                    },
                    {
                        path: "/resources/paths",
                        loader: () => {
                            return {
                                countsByProperty: [
                                    ["/", 100],
                                    ["/about", 80],
                                    ["/contact", 60],
                                ],
                            };
                        },
                    },
                    {
                        path: "/resources/referrer",
                        loader: () => {
                            return {
                                countsByProperty: [
                                    ["google.com", 100],
                                    ["facebook.com", 80],
                                    ["twitter.com", 60],
                                ],
                            };
                        },
                    },
                    {
                        path: "/resources/browser",
                        loader: () => {
                            return {
                                countsByProperty: [
                                    ["Chrome", 100],
                                    ["Safari", 80],
                                    ["Firefox", 60],
                                ],
                            };
                        },
                    },
                    {
                        path: "/resources/country",
                        loader: () => {
                            return {
                                countsByProperty: [
                                    ["United States", 100],
                                    ["Canada", 80],
                                    ["United Kingdom", 60],
                                ],
                            };
                        },
                    },
                    {
                        path: "/resources/device",
                        loader: () => {
                            return {
                                countsByProperty: [
                                    ["Desktop", 100],
                                    ["Mobile", 80],
                                    ["Tablet", 60],
                                ],
                            };
                        },
                    },
                ],
            },
        ]);

        render(<RemixStub />);

        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Chrome"));

        // assert some of the data we mocked actually rendered into the document
        expect(screen.getByText("2.1K")).toBeInTheDocument(); // view count
        expect(screen.getByText("33")).toBeInTheDocument(); // visitor count

        expect(screen.getByText("/about")).toBeInTheDocument();
        expect(screen.getByText("Chrome")).toBeInTheDocument();
        expect(screen.getByText("google.com")).toBeInTheDocument();
        expect(screen.getByText("Canada")).toBeInTheDocument(); // assert converted CA -> Canada
        expect(screen.getByText("Mobile")).toBeInTheDocument();
    });
});
