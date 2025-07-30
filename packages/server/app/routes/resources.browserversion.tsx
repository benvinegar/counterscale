import type { LoaderFunctionArgs } from "react-router";

import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    return {
        countsByProperty: await analyticsEngine.getCountByBrowserVersion(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    };
}

export const BrowserVersionCard = ({
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
        <PaginatedTableCard<typeof loader>
            siteId={siteId}
            interval={interval}
            columnHeaders={[`${filters.browserName} Versions`, "Visitors"]}
            loaderUrl="/resources/browserversion"
            onClick={(browserVersion) =>
                onFilterChange({ ...filters, browserVersion })
            }
            filters={filters}
            timezone={timezone}
        />
    );
};
