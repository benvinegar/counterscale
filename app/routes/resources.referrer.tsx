import { useFetcher } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";

import { getFiltersFromSearchParams } from "~/lib/utils";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.cloudflare.cf.timezone as string;

    const url = new URL(request.url);
    const filters = getFiltersFromSearchParams(new URL(url).searchParams);

    return json({
        countsByProperty: await analyticsEngine.getCountByReferrer(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    });
}

export const ReferrerCard = ({
    siteId,
    interval,
    filters,
    onFilterChange,
}: {
    siteId: string;
    interval: string;
    filters: Record<string, string>;
    onFilterChange: (filters: Record<string, string>) => void;
}) => {
    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Referrer", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/referrer"
            filters={filters}
            onClick={(referrer) => onFilterChange({ ...filters, referrer })}
        />
    );
};
