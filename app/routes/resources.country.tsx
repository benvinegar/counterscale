import { useFetcher } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";

function convertCountryCodesToNames(
    countByCountry: [string, number][],
): [string, number][] {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return countByCountry.map((countByBrowserRow) => {
        let countryName;
        try {
            // throws an exception if country code isn't valid
            //   use try/catch to be defensive and not explode if an invalid
            //   country code gets insrted into Analytics Engine
            countryName = regionNames.of(countByBrowserRow[0])!; // "United States"
        } catch (err) {
            countryName = "(unknown)";
        }
        const count = countByBrowserRow[1];
        return [countryName, count];
    });
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.requestTimezone as string;

    const countByCountry = await analyticsEngine.getCountByCountry(
        site,
        interval,
        tz,
        Number(page),
    );

    // normalize country codes to country names
    // NOTE: this must be done ONLY on server otherwise hydration mismatches
    //       can occur because Intl.DisplayNames produces different results
    //       in different browsers (see )
    const normalizedCountByCountry = convertCountryCodesToNames(countByCountry);

    return json({
        countsByProperty: normalizedCountByCountry,
        page: Number(page),
    });
}

export const CountryCard = ({
    siteId,
    interval,
}: {
    siteId: string;
    interval: string;
}) => {
    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Country", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/country"
        />
    );
};
