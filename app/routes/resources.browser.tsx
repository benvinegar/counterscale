import { useFetcher } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.requestTimezone as string;

    return json({
        countsByProperty: await analyticsEngine.getCountByBrowser(
            site,
            interval,
            tz,
            Number(page),
        ),
        page: Number(page),
    });
}

export const BrowserCard = ({
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
            columnHeaders={["Browser", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/browser"
        />
    );
};
