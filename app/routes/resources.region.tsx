import { useFetcher } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.requestTimezone as string;

    const url = new URL(request.url);
    const filters = getFiltersFromSearchParams(new URL(url).searchParams);

    return json({
        countsByProperty: await analyticsEngine.getCountByRegion(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    });
}

export const RegionCard = ({
    siteId,
    interval,
    filters,
    onFilterChange,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    onFilterChange: (filters: SearchFilters) => void;
}) => {
    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Region", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/region"
            filters={filters}
            onClick={(region) => onFilterChange({ ...filters, region })}
        />
    );
};
