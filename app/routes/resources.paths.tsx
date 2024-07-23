import { useFetcher, useSearchParams, useNavigate } from "@remix-run/react";

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

import {
    getFiltersFromUrl as getFiltersFromSearchParams,
    paramsFromUrl,
} from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const tz = context.cloudflare.cf.timezone as string;

    const url = new URL(request.url);
    const filters = getFiltersFromSearchParams(new URL(url).searchParams);

    console.log(filters, site);
    return json({
        countsByProperty: await analyticsEngine.getCountByPath(
            site,
            interval,
            tz,
            filters,
            Number(page),
        ),
        page: Number(page),
    });
}

export const PathsCard = ({
    siteId,
    interval,
}: {
    siteId: string;
    interval: string;
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    function handleClick(path: string) {
        setSearchParams((prev) => {
            prev.set("path", path);
            return prev;
        });
        const navigate = useNavigate();
        navigate(".", { replace: true });
    }

    // convert searchParams to Record
    const filters = getFiltersFromSearchParams(searchParams);

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Path", "Visitors", "Views"]}
            dataFetcher={useFetcher<typeof loader>()}
            filters={filters}
            loaderUrl="/resources/paths"
            onClick={handleClick}
        />
    );
};
