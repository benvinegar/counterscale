import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
    isRouteErrorResponse,
    redirect,
    useLoaderData,
    useNavigation,
    useRevalidator,
    useRouteError,
    useSearchParams,
} from "react-router";

import { BrowserCard } from "./resources.browser";
import { BrowserVersionCard } from "./resources.browserversion";
import { CountryCard } from "./resources.country";
import { DeviceCard } from "./resources.device";
import { PathsCard } from "./resources.paths";
import { ReferrerCard } from "./resources.referrer";

import { useEffect, useRef } from "react";
import SearchFilterBadges from "~/components/SearchFilterBadges";
import type { SearchFilters } from "~/lib/types";
import {
    getFiltersFromSearchParams,
    getIntervalType,
    getUserTimezone,
} from "~/lib/utils";
import { StatsCard } from "./resources.stats";
import { TimeSeriesCard } from "./resources.timeseries";
import { AnalyticsEngineAPI } from "~/analytics/query";
import { Cloudflare } from "~/load-context";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

const MAX_RETENTION_DAYS = 90;

export const loader = async ({ context, request }: LoaderFunctionArgs<{
    analyticsEngine: AnalyticsEngineAPI;
    cloudflare: Cloudflare;
}>) => {
    if (!context) throw new Error("Context is not defined");

    const { analyticsEngine, cloudflare } = context;
    // NOTE: probably duped from getLoadContext / need to de-duplicate
    if (!cloudflare?.env?.CF_ACCOUNT_ID) {
        throw new Response("Missing credentials: CF_ACCOUNT_ID is not set.", {
            status: 501,
        });
    }
    if (!cloudflare?.env?.CF_BEARER_TOKEN) {
        throw new Response("Missing credentials: CF_BEARER_TOKEN is not set.", {
            status: 501,
        });
    }

    const url = new URL(request.url);

    let interval: string;
    try {
        interval = url.searchParams.get("interval") || "7d";
    } catch {
        interval = "7d";
    }

    // if no siteId is set, redirect to the site with the most hits
    // during the default interval (e.g. 7d)
    if (url.searchParams.has("site") === false) {
        const sitesByHits = await analyticsEngine.getSitesOrderedByHits(interval);

        // if at least one result
        const redirectSite = sitesByHits[0]?.[0] || "";
        const redirectUrl = new URL(request.url);
        redirectUrl.searchParams.set("site", redirectSite);
        throw redirect(redirectUrl.toString());
    }

    const siteId = url.searchParams.get("site") || "";
    const actualSiteId = siteId === "@unknown" ? "" : siteId;

    const filters = getFiltersFromSearchParams(url.searchParams);

    // initiate requests to AE in parallel

    // sites by hits: This is to populate the "sites" dropdown. We query the full retention
    //                period (90 days) so that any site that has been active in the past 90 days
    //                will show up in the dropdown.
    const sitesByHits = analyticsEngine.getSitesOrderedByHits(
        `${MAX_RETENTION_DAYS}d`,
    );

    const intervalType = getIntervalType(interval);

    // await all requests to AE then return the results
    try {
        return {
            siteId: actualSiteId,
            sites: (await sitesByHits).map(([site, _]: [string, number]) => site),
            intervalType,
            interval,
            filters,
        };
    } catch (err) {
        console.error(err);
        throw new Error("Failed to fetch data from Analytics Engine");
    }
};

export default function Dashboard() {
    const [, setSearchParams] = useSearchParams();

    const data = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const loading = navigation.state === "loading";

    // Use ref to debounce revalidation calls
    const lastRevalidateTime = useRef<number>(0);

    // Refetch data when window regains focus
    useEffect(() => {
        const DEBOUNCE_MS = 1_000; // Prevent multiple revalidations within 1 second

        const debouncedRevalidate = () => {
            const now = Date.now();
            if (now - lastRevalidateTime.current > DEBOUNCE_MS) {
                lastRevalidateTime.current = now;
                revalidator.revalidate();
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                debouncedRevalidate();
            }
        };

        const handleFocus = () => {
            debouncedRevalidate();
        };

        // Ensure we're in the browser environment
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            // visibilitychange is more comprehensive (handles tab switching, minimizing, etc.)
            // focus provides additional coverage for window focus scenarios
            document.addEventListener("visibilitychange", handleVisibilityChange);
            window.addEventListener("focus", handleFocus);

            return () => {
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange,
                );
                window.removeEventListener("focus", handleFocus);
            };
        }
    }, [revalidator.revalidate]);

    function changeSite(site: string) {
        // intentionally not updating prev params; don't want search
        // filters (e.g. referrer, path) to persist

        // TODO: might revisit if this is considered unexpected behavior
        setSearchParams({
            site,
            interval: data.interval,
        });
    }

    function changeInterval(interval: string) {
        setSearchParams((prev) => {
            prev.set("interval", interval);
            return prev;
        });
    }

    const handleFilterChange = (filters: SearchFilters) => {
        setSearchParams((prev) => {
            for (const key in filters) {
                if (Object.hasOwnProperty.call(filters, key)) {
                    prev.set(
                        key,
                        filters[key as keyof SearchFilters] as string
                    );
                }
            }
            return prev;
        });
    };

    const handleFilterDelete = (key: string) => {
        setSearchParams((prev) => {
            prev.delete(key);
            return prev;
        });
    };

    const userTimezone = getUserTimezone();

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
            <div className="w-full mb-4 flex gap-4 flex-wrap">
                <div className="lg:basis-1/5-gap-4 sm:basis-1/4-gap-4 basis-1/2-gap-4">
                    <Select
                        defaultValue={data.siteId}
                        onValueChange={(site) => changeSite(site)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {/* SelectItem explodes if given an empty string for `value` so coerce to @unknown */}
                            {data.sites.map((siteId: string) => (
                                <SelectItem
                                    key={`k-${siteId}`}
                                    value={siteId || "@unknown"}
                                >
                                    {siteId || "(unknown)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="lg:basis-1/6-gap-4 sm:basis-1/5-gap-4 basis-1/3-gap-4">
                    <Select
                        defaultValue={data.interval}
                        onValueChange={(interval) => changeInterval(interval)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="1d">24 hours</SelectItem>
                            <SelectItem value="7d">7 days</SelectItem>
                            <SelectItem value="30d">30 days</SelectItem>
                            <SelectItem value="90d">90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => revalidator.revalidate()}
                        disabled={revalidator.state === "loading"}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        aria-label="Refresh dashboard data"
                        title="Refresh data"
                    >
                        <svg
                            className={`h-4 w-4 ${revalidator.state === "loading" ? "animate-spin" : ""}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span className="ml-2">Refresh</span>
                    </button>
                </div>

                <div className="basis-auto flex">
                    <div className="m-auto">
                        <SearchFilterBadges
                            filters={data.filters}
                            onFilterDelete={handleFilterDelete}
                        />
                    </div>
                </div>
            </div>

            <div className="transition" style={{ opacity: loading ? 0.6 : 1 }}>
                <div className="w-full mb-4">
                    <StatsCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        timezone={userTimezone}
                    />
                </div>
                <div className="w-full mb-4">
                    <TimeSeriesCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        timezone={userTimezone}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <PathsCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        onFilterChange={handleFilterChange}
                        timezone={userTimezone}
                    />
                    <ReferrerCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        onFilterChange={handleFilterChange}
                        timezone={userTimezone}
                    />
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    {data.filters?.browserName ? (
                        <BrowserVersionCard
                            siteId={data.siteId}
                            interval={data.interval}
                            filters={data.filters}
                            onFilterChange={handleFilterChange}
                            timezone={userTimezone}
                        />
                    ) : (
                        <BrowserCard
                            siteId={data.siteId}
                            interval={data.interval}
                            filters={data.filters}
                            onFilterChange={handleFilterChange}
                            timezone={userTimezone}
                        />
                    )}

                    <CountryCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        onFilterChange={handleFilterChange}
                        timezone={userTimezone}
                    />

                    <DeviceCard
                        siteId={data.siteId}
                        interval={data.interval}
                        filters={data.filters}
                        onFilterChange={handleFilterChange}
                        timezone={userTimezone}
                    />
                </div>
            </div>
        </div>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    const errorTitle = isRouteErrorResponse(error) ? error.status : "Error";
    const errorBody = isRouteErrorResponse(error)
        ? error.data
        : error instanceof Error
            ? error.message
            : "Unknown error";

    return (
        <div className="border-2 rounded p-4 bg-card">
            <h1 className="text-2xl font-bold">{errorTitle}</h1>
            <p className="text-lg">{errorBody}</p>
        </div>
    );
}
