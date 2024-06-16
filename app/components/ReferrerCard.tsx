import React, { useEffect, useState } from "react";
import TableCard from "./TableCard";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

import { useSearchParams } from "@remix-run/react";

const ReferrerCard: React.FC<{
    countByReferrer: [string, number][];
    initialPage: number;
}> = ({ countByReferrer, initialPage }) => {
    const [_, setSearchParams] = useSearchParams();
    const page = initialPage;

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
        </Card>
    );
};

export default ReferrerCard;
