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
        countsByProperty: await analyticsEngine.getCountByDeviceType(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    };
}

export const DeviceCard = ({
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
            columnHeaders={["Device", "Visitors"]}
            loaderUrl="/resources/device"
            filters={filters}
            onClick={(deviceType) => onFilterChange({ ...filters, deviceType })}
            timezone={timezone}
            labelFormatter={(label) =>
                label.charAt(0).toUpperCase() + label.slice(1)
            }
        />
    );
};
