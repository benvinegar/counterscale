import { useEffect, useState } from "react";
import TableCard from "~/components/TableCard";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";
import { SearchFilters } from "~/lib/types";

interface PaginatedTableCardProps {
    siteId: string;
    interval: string;
    dataFetcher: any;
    columnHeaders: string[];
    filters?: SearchFilters;
    loaderUrl: string;
    onClick?: (key: string) => void;
    timezone?: string;
}

const PaginatedTableCard = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    filters,
    loaderUrl,
    onClick,
    timezone,
}: PaginatedTableCardProps) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const [page, setPage] = useState(1);

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
            page,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: loaderUrl,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaderUrl, siteId, interval, filters, timezone, page]); //

    function handlePagination(page: number) {
        setPage(page);
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
