import { useFetcher } from "@remix-run/react";

// app/routes/resources/customers.tsx
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const url = new URL(request.url);
    const interval = url.searchParams.get("interval") || "";
    const siteId = url.searchParams.get("site") || "";

    const tz = context.requestTimezone as string;

    const page = Number(url.searchParams.get("referrer_page") || 1);
    const countByReferrer = await analyticsEngine.getCountByReferrer(
        siteId,
        interval,
        tz,
        page,
    );

    return json({
        countByReferrer: countByReferrer,
        page,
    });
}

import { useEffect } from "react";
import TableCard from "~/components/TableCard";
import { Card } from "~/components/ui/card";

export const ReferrerCard = ({
    siteId,
    interval,
    error,
}: {
    siteId: string;
    interval: string;
    error?: string | null;
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
        // Your code here
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `/resources/referrer?site=${siteId}&interval=${interval}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
        // TODO: is there a way of updating the query string with this state without triggering a navigation?
        dataFetcher.load(
            `/resources/referrer?site=${siteId}&interval=${interval}&referrer_page=${page}`,
        );
    }

    return (
        <Card>
            {countByReferrer ? (
                <div>
                    <TableCard
                        countByProperty={countByReferrer}
                        columnHeaders={["Referrer", "Visitors"]}
                    />
                    <div className="text-right">
                        <span>Page: {page}</span>
                        <a
                            onClick={() => handlePagination(page - 1)}
                            className="text-blue-600"
                        >
                            ←
                        </a>
                        <a
                            onClick={() => handlePagination(page + 1)}
                            className="text-blue-600"
                        >
                            →
                        </a>
                    </div>
                </div>
            ) : null}
        </Card>
    );
};
