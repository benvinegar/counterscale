// @vitest-environment jsdom

import { ReactNode } from "react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { loader, TimeSeriesCard } from "../resources.timeseries";
import * as RemixReact from "@remix-run/react";
import "vitest-dom/extend-expect";
import { getDefaultContext } from "./testutils";

// Mock the useFetcher hook
vi.mock("@remix-run/react", async () => {
    const actual = await vi.importActual("@remix-run/react");
    return {
        ...actual,
        useFetcher: vi.fn(),
    };
});

describe("resources.timeseries loader", () => {
    const { context } = getDefaultContext();

    beforeEach(() => {
        vi.spyOn(
            context.analyticsEngine,
            "getViewsGroupedByInterval",
        ).mockResolvedValue([
            ["2024-01-15T00:00:00Z", { views: 100, visitors: 0, bounces: 0 }],
            ["2024-01-16T00:00:00Z", { views: 200, visitors: 0, bounces: 0 }],
        ]);

        // mock out responsive container to just return a standard div, otherwise
        // recharts doesnt render underneath
        vi.mock("recharts", async () => {
            const OriginalModule = await vi.importActual("recharts");
            return {
                ...OriginalModule,
                ResponsiveContainer: ({
                    children,
                }: {
                    children: ReactNode;
                }) => <div>{children}</div>,
            };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("processes data correctly", async () => {
        const request = new Request(
            "http://test.com?interval=7d&site=test-site&timezone=UTC",
        );
        const result = await loader({
            // @ts-expect-error we don't need to provide all the properties of the contextobject
            context,
            request,
        });

        const data = await result;
        expect(data.chartData).toEqual([
            {
                date: "2024-01-15T00:00:00Z",
                views: 100,
                visitors: 0,
                bounceRate: 0,
            },
            {
                date: "2024-01-16T00:00:00Z",
                views: 200,
                visitors: 0,
                bounceRate: 0,
            },
        ]);
        expect(data.intervalType).toBe("DAY");

        expect(
            context.analyticsEngine.getViewsGroupedByInterval,
        ).toHaveBeenCalledWith(
            "test-site",
            "DAY",
            expect.any(Date),
            expect.any(Date),
            "UTC",
            {},
        );
    });
});

describe("TimeSeriesCard", () => {
    const mockFetcher = {
        submit: vi.fn(),
        data: {
            chartData: [
                { date: "2024-01-15T00:00:00Z", views: 100 },
                { date: "2024-01-16T00:00:00Z", views: 200 },
            ],
            intervalType: "DAY",
        },
    };

    beforeEach(() => {
        // @ts-expect-error we don't need to provide all the properties of the mockFetcher
        vi.mocked(RemixReact.useFetcher).mockReturnValue(mockFetcher);

        // Mock ResizeObserver for recharts
        global.ResizeObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("fetches data on mount", () => {
        const props = {
            siteId: "test-site",
            interval: "7d",
            filters: {},
            timezone: "UTC",
        };

        render(<TimeSeriesCard {...props} />);

        expect(mockFetcher.submit).toHaveBeenCalledWith(
            {
                site: "test-site",
                interval: "7d",
                timezone: "UTC",
            },
            {
                method: "get",
                action: "/resources/timeseries",
            },
        );
    });

    test("renders TimeSeriesChart when data is available", async () => {
        const props = {
            siteId: "test-site",
            interval: "7d",
            filters: {},
            timezone: "UTC",
        };

        render(<TimeSeriesCard {...props} />);

        // Wait for the chart to be rendered
        await waitFor(() => screen.getAllByText("Mon, Jan 15").length > 0);
    });

    test("refetches when props change", () => {
        expect(mockFetcher.submit).toHaveBeenCalledTimes(0);

        const props = {
            siteId: "test-site",
            interval: "7d",
            filters: {},
            timezone: "UTC",
        };

        const { rerender } = render(<TimeSeriesCard {...props} />);

        // Change interval
        rerender(<TimeSeriesCard {...props} interval="1d" />);

        expect(mockFetcher.submit).toHaveBeenCalledTimes(2);
        expect(mockFetcher.submit).toHaveBeenLastCalledWith(
            {
                site: "test-site",
                interval: "1d",
                timezone: "UTC",
            },
            {
                method: "get",
                action: "/resources/timeseries",
            },
        );
    });
});
