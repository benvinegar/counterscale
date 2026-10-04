// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import "vitest-dom/extend-expect";

import TimeSeriesChart from "../TimeSeriesChart";

vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    ComposedChart: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: ({
        yAxisId,
        domain,
    }: {
        yAxisId: string;
        domain: [number, number];
    }) => (
        <div
            data-testid={`y-axis-${yAxisId}`}
            data-domain={JSON.stringify(domain)}
        />
    ),
    Tooltip: () => null,
    Area: () => null,
    Line: () => null,
}));

describe("TimeSeriesChart", () => {
    afterEach(() => {
        cleanup();
    });

    test("scales bounce rate against a fixed 0–100% domain", () => {
        render(
            <TimeSeriesChart
                intervalType="DAY"
                data={[
                    {
                        date: "2025-01-01T00:00:00.000Z",
                        views: 100,
                        visitors: 75,
                        bounceRate: 46,
                    },
                ]}
            />,
        );

        expect(screen.getByTestId("y-axis-bounceRate")).toHaveAttribute(
            "data-domain",
            "[0,100]",
        );
    });
});
