// @vitest-environment jsdom
import { json } from "@remix-run/node";
import { test, describe } from "vitest";
import 'vitest-dom/extend-expect';

import { createRemixStub } from "@remix-run/testing";
import {
    render
} from "@testing-library/react";

import Dashboard from "./dashboard";

describe("Dashboard route", () => {
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
});