import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import TableCard, { CountByProperty } from "~/components/TableCard";
import type { SearchFilters } from "~/lib/types";
import PaginationButtons from "./PaginationButtons";
import { Card } from "./ui/card";

interface PaginatedTableCardProps {
    siteId: string;
    interval: string;
    columnHeaders: string[];
    filters?: SearchFilters;
    loaderUrl: string;
    onClick?: (key: string) => void;
    timezone?: string;
    labelFormatter?: (label: string) => string;
}

const PaginatedTableCard = <T extends (...args: any[]) => Promise<{ countsByProperty: CountByProperty }>>({
    siteId,
    interval,
    columnHeaders,
    filters,
    loaderUrl,
    onClick,
    timezone,
    labelFormatter,
}: PaginatedTableCardProps) => {
    const fetcher = useFetcher<Awaited<ReturnType<T>>>();
    const [page, setPage] = useState(1);
    const lastParamsRef = useRef<string>("");

    const countsByProperty = fetcher.data?.countsByProperty || [];

    // Create a stable function to load data
    const loadData = useCallback(() => {
        const url = new URL(loaderUrl, window.location.origin);
        url.searchParams.set("site", siteId);
        url.searchParams.set("interval", interval);
        url.searchParams.set("page", page.toString());

        if (timezone) {
            url.searchParams.set("timezone", timezone);
        }

        // Add filter parameters
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value) {
                    url.searchParams.set(key, value);
                }
            }
        }

        const fullUrl = url.pathname + url.search;

        // Only load if parameters have actually changed
        if (lastParamsRef.current !== fullUrl) {
            lastParamsRef.current = fullUrl;
            fetcher.load(fullUrl);
        }
    }, [fetcher.load, loaderUrl, siteId, interval, filters, timezone, page]);

    // Load data when parameters change
    useEffect(() => {
        loadData();
    }, [loadData]);

    function handlePagination(newPage: number) {
        setPage(newPage);
    }

    const hasMore = countsByProperty.length === 10;

    return (
        <Card className={fetcher.state === "loading" ? "opacity-60" : ""}>
            {countsByProperty ? (
                <div className="grid grid-rows-[auto,40px] h-full">
                    <TableCard
                        countByProperty={countsByProperty}
                        columnHeaders={columnHeaders}
                        onClick={onClick}
                        labelFormatter={labelFormatter}
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
