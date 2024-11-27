import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
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

    const counts = await analyticsEngine.getCounts(site, interval, tz, filters);

    return json({
        views: counts.views,
        visits: counts.visits,
        visitors: counts.visitors,
        bounces: counts.bounces,
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

    const { views, visits, visitors, bounces } = dataFetcher.data || {};
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
                        <div className="text-md sm:text-lg">Visits</div>
                        <div className="text-4xl">
                            {visits ? countFormatter.format(visits) : "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-md sm:text-lg">Visitors</div>
                        <div className="text-4xl">
                            {visitors ? countFormatter.format(visitors) : "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-md sm:text-lg">Bounces</div>
                        <div className="text-4xl">
                            {bounces ? countFormatter.format(bounces) : "-"}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
