import { useFetcher } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;
    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const countsByCountry = await analyticsEngine.getCountByCountry(
        site,
        interval,
        tz,
        filters,
        Number(page),
    );

    // normalize country codes to country names
    // NOTE: this must be done ONLY on server otherwise hydration mismatches
    //       can occur because Intl.DisplayNames produces different results
    //       in different browsers (see https://github.com/benvinegar/counterscale/issues/72)
    const countsByProperty = countsByCountry.map(([code, count]) => [
        convertCountryCodesToNames(code),
        count,
    ]);

    return json({
        countsByProperty,
        page: Number(page),
    });
}

export const CountryCard = ({
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
    const dataFetcher = useFetcher<typeof loader>();

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Country", "Visitors"]}
            dataFetcher={dataFetcher}
            loaderUrl="/resources/country"
            filters={filters}
            onClick={(country) => onFilterChange({ ...filters, country })}
            timezone={timezone}
        />
    );
};

// Helper function to convert country codes to names
function convertCountryCodesToNames(countryCode: string): string {
    try {
        return (
            new Intl.DisplayNames(["en"], { type: "region" }).of(
                countryCode.toUpperCase(),
            ) || countryCode
        );
    } catch (e) {
        // throws an exception if country code isn't valid
        //   use try/catch to be defensive and not explode if an invalid
        //   country code gets insrted into Analytics Engine
        return "(unknown)";
    }
}
