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
    filters,
}: {
    siteId: string;
    interval: string;
    filters: Record<string, string>;
}) => {
    const [, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    function handleClick(path: string) {
        setSearchParams((prev) => {
            prev.set("path", path);
            return prev;
        });
        navigate(".", { replace: true });
    }

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
