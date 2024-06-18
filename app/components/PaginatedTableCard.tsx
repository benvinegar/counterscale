import { useEffect } from "react";
import TableCard from "~/components/TableCard";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";

const ReferrerCard = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    loaderUrl,
}: {
    siteId: string;
    interval: string;
    dataFetcher: any;
    columnHeaders: string[];
    loaderUrl: string;
}) => {
    // const dataFetcher = useFetcher<typeof loader>();
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const page = dataFetcher.data?.page || 1;

    useEffect(() => {
        // Your code here
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}`,
            );
        }
    }, []);

    useEffect(() => {
        // NOTE: intentionally resets page to default when interval or site changes
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
        // TODO: is there a way of updating the query string with this state without triggering a navigation?
        dataFetcher.load(
            `${loaderUrl}?site=${siteId}&interval=${interval}&page=${page}`,
        );
    }

    const hasMore = countsByProperty.length === 10;
    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            {countsByProperty ? (
                <div className="grid grid-rows-[auto,40px] h-full">
                    <TableCard
                        countByProperty={countsByProperty}
                        columnHeaders={columnHeaders}
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

export default ReferrerCard;
