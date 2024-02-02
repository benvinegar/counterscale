// @vitest-environment jsdom
import { json } from "@remix-run/node";
import { vi, test, describe, beforeAll, expect } from "vitest";
import 'vitest-dom/extend-expect';

import { createRemixStub } from "@remix-run/testing";
import {
    render,
    screen,
    waitFor
} from "@testing-library/react";

import Dashboard, { loader } from "./dashboard";

global.fetch = vi.fn();
function createFetchResponse(data: any) {
    return {
        ok: true,
        json: () => new Promise((resolve) => resolve(data))
    }
}

describe("Dashboard route", () => {
    const fetch = global.fetch as any;

    beforeAll(() => {
        // polyfill needed for recharts (used by TimeSeriesChart)
        global.ResizeObserver = require('resize-observer-polyfill')
    });

    describe("loader", () => {
        test("assembles data returned from CF API", async () => {
            // response for getSitesByOrderedHits
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { siteId: 'test-siteid', count: 1 }
                    ]
                }))
            }));

            // response for get counts
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { isVisit: "1", isVisitor: "1", count: 1 }
                    ]
                }))
            }));

            // response for getCountByPath
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { blob3: "/", count: 1 }
                    ]
                }))
            }));

            // response for getCountByCountry
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { blob4: "US", count: 1 }
                    ]
                }))
            }));

            // response for getCountByReferrer
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { blob5: "google.com", count: 1 }
                    ]
                }))
            }));

            // response for getCountByBrowser
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { blob6: "Chrome", count: 1 }
                    ]
                }))
            }));

            // response for getCountByDevice
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { blob7: "Desktop", count: 1 }
                    ]
                }))
            }));

            // response for getViewsGroupedByInterval
            fetch.mockResolvedValueOnce(new Promise(resolve => {
                resolve(createFetchResponse({
                    data: [
                        { bucket: "2024-01-11 00:00:00", count: 1 }
                    ]
                }))
            }));


            await loader({
                context: {
                    env: {
                        CF_BEARER_TOKEN: 'fake',
                        CF_ACCOUNT_ID: 'fake',
                    }
                },
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: 'http://localhost:3000/dashboard'
                }
            });
        });
    });

    test("renders when no data", async () => {

        function loader() {
            return json({
                siteId: '@unknown',
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
                intervalType: 'day'
            });
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader
            },
        ]);

        render(<RemixStub />);

        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Country"));
        expect(screen.getByText('Country')).toBeInTheDocument();
    });

    const defaultMockedLoaderJson = {
        siteId: 'example',
        sites: ['example'],
        views: 100,
        visits: 80,
        visitors: 33,
        countByPath: [
            ['/', 100],
            ['/about', 80],
            ['/contact', 60],
        ],
        countByBrowser: [
            ['Chrome', 100],
            ['Safari', 80],
            ['Firefox', 60],
        ],
        countByCountry: [
            ['US', 100],
            ['CA', 80],
            ['UK', 60],
        ],
        countByReferrer: [
            ['google.com', 100],
            ['facebook.com', 80],
            ['twitter.com', 60],
        ],
        countByDevice: [
            ['Desktop', 100],
            ['Mobile', 80],
            ['Tablet', 60],
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
        intervalType: 'day'
    };

    test("renders with valid data", async () => {

        function loader() {
            return json({ ...defaultMockedLoaderJson });
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader
            },
        ]);

        render(<RemixStub />);

        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Chrome"));

        // assert some of the data we mocked actually rendered into the document
        expect(screen.getByText('33')).toBeInTheDocument();
        expect(screen.getByText('/about')).toBeInTheDocument();
        expect(screen.getByText('Chrome')).toBeInTheDocument();
        expect(screen.getByText('google.com')).toBeInTheDocument();
        expect(screen.getByText('Canada')).toBeInTheDocument(); // assert converted CA -> Canada
        expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    test("renders with invalid country code", async () => {
        function loader() {
            return json({
                ...defaultMockedLoaderJson,
                countByCountry: [
                    ['US', 100],
                    ['CA', 80],
                    ['not_a_valid_country_code', 60],
                ]
            });
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Dashboard,
                loader
            },
        ]);

        render(<RemixStub />);

        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Chrome"));

        // assert the invalid country code was converted to "(unknown)"
        expect(screen.getByText('(unknown)')).toBeInTheDocument();
    });
});