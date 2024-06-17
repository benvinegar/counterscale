import { useFetcher } from "@remix-run/react";

import { ArrowRight, ArrowLeft } from "lucide-react";

import { paramsFromUrl } from "~/lib/utils";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.requestTimezone as string;

    const countByPath = await analyticsEngine.getCountByPath(
        site,
        interval,
        tz,
        Number(page),
    );

    return json({
        countByPath,
        page: Number(page),
    });
}

import { useEffect } from "react";
import TableCard from "~/components/TableCard";
import { Card } from "~/components/ui/card";

export const PathsCard = ({
    siteId,
    interval,
    error,
}: {
    siteId: string;
    interval: string;
    error?: string | null;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const countByPath = dataFetcher.data?.countByPath || [];
    const page = dataFetcher.data?.page || 1;

    useEffect(() => {
        // Your code here
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `/resources/paths?site=${siteId}&interval=${interval}`,
            );
        }
    }, []);

    useEffect(() => {
        // NOTE: intentionally resets page to default when interval or site changes
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `/resources/paths?site=${siteId}&interval=${interval}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
        // TODO: is there a way of updating the query string with this state without triggering a navigation?
        dataFetcher.load(
            `/resources/paths?site=${siteId}&interval=${interval}&paths_page=${page}`,
        );
    }

    const hasMore = countByPath.length === 10;
    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            {countByPath ? (
                <div className="grid grid-rows-[auto,40px] h-full">
                    <TableCard
                        countByProperty={countByPath}
                        columnHeaders={["Page", "Visitors", "Views"]}
                    />
                    <div className="p-2 pr-0 grid grid-cols-[auto,2rem,2rem] text-right">
                        <div></div>
                        <a
                            onClick={() => {
                                if (page > 1) handlePagination(page - 1);
                            }}
                            className={
                                page > 1
                                    ? `text-primary hover:cursor-pointer`
                                    : `text-orange-300`
                            }
                        >
                            <ArrowLeft />
                        </a>
                        <a
                            onClick={() => {
                                if (hasMore) handlePagination(page + 1);
                            }}
                            className={
                                hasMore
                                    ? "text-primary hover:cursor-pointer"
                                    : "text-orange-300"
                            }
                        >
                            <ArrowRight />
                        </a>
                    </div>
                </div>
            ) : null}
        </Card>
    );
};
