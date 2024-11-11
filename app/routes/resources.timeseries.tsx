import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import {
    getFiltersFromSearchParams,
    paramsFromUrl,
    getIntervalType,
    getDateTimeRange,
} from "~/lib/utils";
import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Card, CardContent } from "~/components/ui/card";
import TimeSeriesChart from "~/components/TimeSeriesChart";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const tz = context.cloudflare.cf.timezone as string;

    const url = new URL(request.url);
    const filters = getFiltersFromSearchParams(url.searchParams);

    const intervalType = getIntervalType(interval);
    const { startDate, endDate } = getDateTimeRange(interval, tz);

    const viewsGroupedByInterval =
        await analyticsEngine.getViewsGroupedByInterval(
            site,
            intervalType,
            startDate,
            endDate,
            tz,
            filters,
        );

    return json({
        chartData: viewsGroupedByInterval,
        intervalType: intervalType,
    });
}

export const TimeSeriesCard = ({
    siteId,
    interval,
    filters,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const { chartData, intervalType } = dataFetcher.data || {};

    useEffect(() => {
        if (dataFetcher.state === "idle" && !dataFetcher.data) {
            const filterString = filters
                ? Object.entries(filters)
                      .map(([key, value]) => `&${key}=${value}`)
                      .join("")
                : "";

            const url = `/resources/timeseries?site=${siteId}&interval=${interval}${filterString}`;
            dataFetcher.load(url);
        }
    }, [siteId, interval, filters]);

    return (
        <Card>
            <CardContent>
                <div className="h-72 pt-6 -m-4 -ml-8 sm:m-0">
                    {chartData && (
                        <TimeSeriesChart
                            data={chartData}
                            intervalType={intervalType}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
