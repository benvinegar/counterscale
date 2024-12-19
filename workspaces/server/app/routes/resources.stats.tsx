import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
    getDateTimeRange,
    getFiltersFromSearchParams,
    paramsFromUrl,
} from "~/lib/utils";
import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Card } from "~/components/ui/card";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    // intentionally parallelize queries by deferring await
    const earliestEvents = analyticsEngine.getEarliestEvents(site);
    const counts = await analyticsEngine.getCounts(site, interval, tz, filters);

    const { earliestEvent, earliestBounce } = await earliestEvents;
    const { startDate } = getDateTimeRange(interval, tz);

    // FOR BACKWARDS COMPAT, ONLY SHOW BOUNCE RATE IF WE HAVE DATE FOR THE ENTIRE QUERY PERIOD
    // -----------------------------------------------------------------------------
    // Bounce rate is a later-introduced metric that may not have been recorded for
    // the full duration of the queried Counterscale dataset (not possible to backfill
    // data we dont have!)

    // So, cannot reliably show "bounce rate" if bounce data was unavailable for a portion
    // of the query period.

    // To figure out if we can give an answer or not, we inspect the earliest bounce/earliest event
    // data recorded, and determine if our dataset is "complete" for the given query interval.

    const hasSufficientBounceData =
        earliestBounce !== null &&
        earliestEvent !== null &&
        (earliestEvent.getTime() == earliestBounce.getTime() || // earliest event recorded a bounce -- any query is fine
            earliestBounce < startDate); // earliest bounce occurred before start of query period -- this query is fine

    const bounceRate =
        counts.visitors > 0 ? counts.bounces / counts.visitors : undefined;

    return {
        views: counts.views,
        visitors: counts.visitors,
        bounceRate: bounceRate,
        hasSufficientBounceData,
    };
}

export const StatsCard = ({
    siteId,
    interval,
    filters,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    timezone: string;
}) => {
    const dataFetcher = useFetcher<typeof loader>();

    const { views, visitors, bounceRate, hasSufficientBounceData } =
        dataFetcher.data || {};
    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: `/resources/stats`,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, filters, timezone]);

    return (
        <Card>
            <div className="p-4 pl-6">
                <div className="grid grid-cols-3 gap-10 items-end">
                    <div>
                        <div className="text-md sm:text-lg">Visitors</div>
                        <div className="text-4xl">
                            {visitors ? countFormatter.format(visitors) : "-"}
                        </div>
                    </div>

                    <div>
                        <div className="text-md sm:text-lg">Views</div>
                        <div className="text-4xl">
                            {views ? countFormatter.format(views) : "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-md sm:text-lg">
                            <span>
                                Bounce
                                <span className="hidden sm:inline"> Rate</span>
                            </span>
                        </div>
                        <div className="text-4xl">
                            {hasSufficientBounceData
                                ? bounceRate !== undefined
                                    ? `${Math.round(bounceRate * 100)}%`
                                    : "-"
                                : "n/a"}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
