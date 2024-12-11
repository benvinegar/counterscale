import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
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

    // FOR BACKWARDS COMPATIBILITY, ONLY CALCULATE BOUNCE RATE IF WE HAVE
    // DATE FOR THE ENTIRE QUERY PERIOD
    // -----------------------------------------------------------------------------
    // bounce rate is a later-introduced metric that may not have been recorded for
    // the full duration of the queried Counterscale dataset (not possible to backfill
    // data we dont have!)

    // so, cannot reliably show "bounce rate" if bounce data was unavailable for a portion
    // of the query period

    // to figure if we can give an answer or not, we inspect the earliest bounce/earliest event data,
    // and decide if our dataset is "complete" for the given interval
    let bounceRate;

    if (
        counts.visitors > 0 &&
        earliestBounce !== null &&
        earliestEvent !== null &&
        (earliestEvent.getTime() == earliestBounce.getTime() || // earliest event recorded a bounce -- any query is fine
            earliestBounce < startDate) // earliest bounce occurred before start of query period -- this query is fine
    ) {
        bounceRate = (counts.bounces / counts.visitors).toLocaleString(
            "en-US",
            {
                style: "percent",
                minimumFractionDigits: 0,
            },
        );
    } else {
        bounceRate = "n/a";
    }

    return json({
        views: counts.views,
        visitors: counts.visitors,
        bounceRate: bounceRate,
    });
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

    const { views, visitors, bounceRate } = dataFetcher.data || {};
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
                        <div className="text-md">Views</div>
                        <div className="text-4xl">
                            {views ? countFormatter.format(views) : "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-md sm:text-lg">Visitors</div>
                        <div className="text-4xl">
                            {visitors ? countFormatter.format(visitors) : "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-md sm:text-lg">Bounce Rate</div>
                        <div className="text-4xl">{bounceRate}</div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
