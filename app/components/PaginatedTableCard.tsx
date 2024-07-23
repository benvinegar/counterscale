import { useEffect } from "react";
import TableCard from "~/components/TableCard";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";

const PaginatedTableCard = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    filters,
    loaderUrl,
    onClick,
}: {
    siteId: string;
    interval: string;
    dataFetcher: any; // ignore type for now
    columnHeaders: string[];
    filters: Record<string, string>;
    loaderUrl: string;
    onClick?: Function;
}) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const page = dataFetcher.data?.page || 1;

    // turn filters into query string
    const filterString = filters
        ? Object.entries(filters).map(([key, value]) => `&${key}=${value}`)
        : "";

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}${filterString}`,
            );
        }
    }, []);

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            dataFetcher.load(
                `${loaderUrl}?site=${siteId}&interval=${interval}${filterString}`,
            );
        }
    }, [siteId, interval]);

    function handlePagination(page: number) {
        dataFetcher.load(
            `${loaderUrl}?site=${siteId}&interval=${interval}&page=${page}${filterString}`,
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
                        onClick={onClick}
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

export default PaginatedTableCard;
