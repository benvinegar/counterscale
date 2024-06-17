import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { paramsFromUrl } from "~/lib/utils";
import TableCard from "~/components/TableCard";
import { Card } from "~/components/ui/card";
import PaginationButtons from "~/components/PaginationButtons";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.requestTimezone as string;

    const countByReferrer = await analyticsEngine.getCountByReferrer(
        site,
        interval,
        tz,
        Number(page),
    );

    return json({
        countByReferrer: countByReferrer,
        page: Number(page),
    });
}

export const ReferrerCard = ({
    siteId,
    interval,
}: {
    siteId: string;
    interval: string;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const countByReferrer = dataFetcher.data?.countByReferrer || [];
    const page = dataFetcher.data?.page || 1;

    useEffect(() => {
        // Your code here
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `/resources/referrer?site=${siteId}&interval=${interval}`,
            );
        }
    }, []);

    useEffect(() => {
        // NOTE: intentionally resets page to default when interval or site changes
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `/resources/referrer?site=${siteId}&interval=${interval}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
        // TODO: is there a way of updating the query string with this state without triggering a navigation?
        dataFetcher.load(
            `/resources/referrer?site=${siteId}&interval=${interval}&page=${page}`,
        );
    }

    const hasMore = countByReferrer.length === 10;
    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            {countByReferrer ? (
                <div className="grid grid-rows-[auto,40px] h-full">
                    <TableCard
                        countByProperty={countByReferrer}
                        columnHeaders={["Referrer", "Visitors"]}
                    />
                    <PaginationButtons
                        page={page}
                        hasMore={hasMore}
                        handlePagination={handlePagination}
                    />
                </div>
            ) : null}
        </Card>
    );
};
