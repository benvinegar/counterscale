import type { LoaderFunctionArgs } from "react-router";

import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";
import { AnalyticsEngineAPI } from "~/analytics/query";

export async function loader({ context, request }: LoaderFunctionArgs<{
	analyticsEngine: AnalyticsEngineAPI;
}>) {
    const { analyticsEngine } = context || {};
    if (!analyticsEngine) throw new Error("Analytics engine is not defined");

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    return {
        countsByProperty: await analyticsEngine.getCountByBrowser(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    };
}

export const BrowserCard = ({
    siteId,
    interval,
    filters,
    onFilterChange,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    onFilterChange: (filters: SearchFilters) => void;
    timezone: string;
}) => {
    return (
        <PaginatedTableCard<Awaited<ReturnType<typeof loader>>>
            siteId={siteId}
            interval={interval}
            columnHeaders={["Browser", "Visitors"]}
            loaderUrl="/resources/browser"
            filters={filters}
            onClick={(browserName) =>
                onFilterChange({ ...filters, browserName })
            }
            timezone={timezone}
        />
    );
};
