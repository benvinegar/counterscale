import { useFetcher } from "@remix-run/react";

// app/routes/resources/customers.tsx
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import { AnalyticsEngineAPI } from "../analytics/query";

export async function loader({ context, request }: LoaderFunctionArgs) {
    if (!context.env.CF_BEARER_TOKEN || !context.env.CF_ACCOUNT_ID) {
        throw new Error("Missing Cloudflare credentials");
    }

    const analyticsEngine = new AnalyticsEngineAPI(
        context.env.CF_ACCOUNT_ID,
        context.env.CF_BEARER_TOKEN,
    );

    const url = new URL(request.url);

    let interval;
    try {
        interval = url.searchParams.get("interval") || "7d";
    } catch (err) {
        interval = "7d";
    }

    const siteId = url.searchParams.get("site") || "";
    const actualSiteId = siteId == "@unknown" ? "" : siteId;

    const tz = context.requestTimezone as string;

    console.log(actualSiteId, interval, tz);
    const countByReferrer = await analyticsEngine.getCountByReferrer(
        actualSiteId,
        interval,
        tz,
    );
    console.log(actualSiteId, interval, tz);
    console.log(countByReferrer);
    return json({
        countByReferrer: countByReferrer,
        page: Number(url.searchParams.get("referrer_page") || 1),
    });
}

import React, { useEffect, useState } from "react";
import TableCard from "~/components/TableCard";
import { Card } from "~/components/ui/card";

import { useSearchParams } from "@remix-run/react";

export const ReferrerCard = ({
    siteId,
    interval,
    error,
}: {
    siteId: string;
    interval: string;
    error?: string | null;
}) => {
    const [_, setSearchParams] = useSearchParams();

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
        setSearchParams(
            { referrer_page: page.toString() },
            {
                preventScrollReset: true,
            },
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
