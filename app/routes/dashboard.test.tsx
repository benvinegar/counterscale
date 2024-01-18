// @vitest-environment jsdom
import { json } from "@remix-run/node";
import { test, describe, beforeAll } from "vitest";
import 'vitest-dom/extend-expect';

import { createRemixStub } from "@remix-run/testing";
import {
    render
} from "@testing-library/react";

import Dashboard from "./dashboard";

describe("Dashboard route", () => {
    beforeAll(() => {
        // polyfill needed for recharts (used by TimeSeriesChart)
        global.ResizeObserver = require('resize-observer-polyfill')
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
    });

    test("renders with data", async () => {

        function loader() {
            return json({
                siteId: 'example',
                sites: ['example'],
                views: 100,
                visits: 80,
                visitors: 60,
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
                    ['United States', 100],
                    ['Canada', 80],
                    ['United Kingdom', 60],
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
    });
});