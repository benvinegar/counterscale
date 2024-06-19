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
    dataFetcher: any; // ignore type for now
    columnHeaders: string[];
    loaderUrl: string;
}) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const page = dataFetcher.data?.page || 1;

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}`,
            );
        }
    }, []);

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
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
