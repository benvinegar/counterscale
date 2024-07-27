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
    filters?: Record<string, string>;
    loaderUrl: string;
    onClick?: (key: string) => void;
}) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const page = dataFetcher.data?.page || 1;

    const loadData = (page: string | undefined = undefined) => {
        // turn filters into query string
        const filterString = filters
            ? Object.entries(filters)
                  .map(([key, value]) => `&${key}=${value}`)
                  .join("")
            : "";

        let url = `${loaderUrl}?site=${siteId}&interval=${interval}${filterString}`;
        if (page) {
            url += `&page=${page}`;
        }

        dataFetcher.load(url);
    };

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            loadData();
        }
    }, []);

    useEffect(() => {
        if (dataFetcher.state === "idle") {
            loadData();
        }
    }, [siteId, interval, filters]);

    function handlePagination(page: number) {
        loadData(page.toString());
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
