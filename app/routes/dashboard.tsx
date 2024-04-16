import { Card, CardContent } from "~/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import {
    useLoaderData,
    useNavigation,
    useSearchParams,
} from "@remix-run/react";

import { AnalyticsEngineAPI } from "../analytics/query";

import TableCard from "~/components/TableCard";
import TimeSeriesChart from "~/components/TimeSeriesChart";
import dayjs from "dayjs";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

const MAX_RETENTION_DAYS = 90;

declare module "@remix-run/server-runtime" {
    export interface AppLoadContext {
        env: {
            VERSION: string;
            CF_BEARER_TOKEN: string;
            CF_ACCOUNT_ID: string;
        };
    }
}

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
    if (!context.env.CF_BEARER_TOKEN || !context.env.CF_ACCOUNT_ID) {
        throw new Error("Missing Cloudflare credentials");
    }

    const analyticsEngine = new AnalyticsEngineAPI(
        context.env.CF_ACCOUNT_ID,
        context.env.CF_BEARER_TOKEN,
    );

    const url = new URL(request.url);

    let interval;
    try {
        interval = url.searchParams.get("interval") || "7d";
    } catch (err) {
        interval = "7d";
    }

    // if no siteId is set, redirect to the site with the most hits
    // during the default interval (e.g. 7d)
    if (url.searchParams.has("site") === false) {
        const sitesByHits =
            await analyticsEngine.getSitesOrderedByHits(interval);

        // if at least one result
        const redirectSite = sitesByHits[0]?.[0] || "";
        const redirectUrl = new URL(request.url);
        redirectUrl.searchParams.set("site", redirectSite);
        return redirect(redirectUrl.toString());
    }
    const siteId = url.searchParams.get("site") || "";

    const actualSiteId = siteId == "@unknown" ? "" : siteId;

    const tz = context.requestTimezone as string;

    // initiate requests to AE in parallel

    // sites by hits: This is to populate the "sites" dropdown. We query the full retention
    //                period (90 days) so that any site that has been active in the past 90 days
    //                will show up in the dropdown.
    const sitesByHits = analyticsEngine.getSitesOrderedByHits(
        `${MAX_RETENTION_DAYS}d`,
        tz,
    );

    const counts = analyticsEngine.getCounts(actualSiteId, interval, tz);
    const countByPath = analyticsEngine.getCountByPath(
        actualSiteId,
        interval,
        tz,
    );
    const countByCountry = analyticsEngine.getCountByCountry(
        actualSiteId,
        interval,
        tz,
    );
    const countByReferrer = analyticsEngine.getCountByReferrer(
        actualSiteId,
        interval,
        tz,
    );
    const countByBrowser = analyticsEngine.getCountByBrowser(
        actualSiteId,
        interval,
        tz,
    );
    const countByDevice = analyticsEngine.getCountByDevice(
        actualSiteId,
        interval,
        tz,
    );

    let intervalType: "DAY" | "HOUR" = "DAY";
    switch (interval) {
        case "today":
        case "1d":
            intervalType = "HOUR";
            break;
        case "7d":
        case "30d":
        case "90d":
            intervalType = "DAY";
            break;
    }
    // get start date in the past by subtracting interval * type

    let localDateTime = dayjs().utc();
    if (interval === "today") {
        localDateTime = localDateTime.tz(tz).startOf("day");
    } else {
        const daysAgo = Number(interval.split("d")[0]);
        if (intervalType === "DAY") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .tz(tz)
                .startOf("day");
        } else if (intervalType === "HOUR") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .startOf("hour");
        }
    }

    const viewsGroupedByInterval = analyticsEngine.getViewsGroupedByInterval(
        actualSiteId,
        intervalType,
        localDateTime.toDate(),
        tz,
    );

    // await all requests to AE then return the results

    let out;

    try {
        out = {
            siteId: siteId,
            sites: (await sitesByHits).map(
                ([site, _]: [string, number]) => site,
            ),
            views: (await counts).views,
            visits: (await counts).visits,
            visitors: (await counts).visitors,
            countByPath: await countByPath,
            countByBrowser: await countByBrowser,
            countByCountry: await countByCountry,
            countByReferrer: await countByReferrer,
            countByDevice: await countByDevice,
            viewsGroupedByInterval: await viewsGroupedByInterval,
            intervalType,
            interval,
        };
    } catch (err) {
        console.error(err);
        throw new Error("Failed to fetch data from Analytics Engine");
    }

    // normalize country codes to country names
    // NOTE: this must be done ONLY on server otherwise hydration mismatches
    //       can occur because Intl.DisplayNames produces different results
    //       in different browsers (see )
    out.countByCountry = convertCountryCodesToNames(out.countByCountry);

    return json(out);
};

function convertCountryCodesToNames(
    countByCountry: [string, number][],
): [string, number][] {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return countByCountry.map((countByBrowserRow) => {
        let countryName;
        try {
            // throws an exception if country code isn't valid
            //   use try/catch to be defensive and not explode if an invalid
            //   country code gets insrted into Analytics Engine
            countryName = regionNames.of(countByBrowserRow[0])!; // "United States"
        } catch (err) {
            countryName = "(unknown)";
        }
        const count = countByBrowserRow[1];
        return [countryName, count];
    });
}

export default function Dashboard() {
    const [, setSearchParams] = useSearchParams();

    const data = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const loading = navigation.state === "loading";

    function changeSite(site: string) {
        setSearchParams((prev) => {
            prev.set("site", site);
            return prev;
        });
    }

    function changeInterval(interval: string) {
        setSearchParams((prev) => {
            prev.set("interval", interval);
            return prev;
        });
    }

    const chartData: { date: string; views: number }[] = [];
    data.viewsGroupedByInterval.forEach((row) => {
        chartData.push({
            date: row[0],
            views: row[1],
        });
    });

    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
            <div className="w-full mb-4 flex gap-4">
                <div className="w-1/2 sm:w-1/3 md:w-1/5">
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

                <div className="w-1/2 sm:w-1/3 md:w-1/5">
                    <Select
                        defaultValue={data.interval}
                        onValueChange={(interval) => changeInterval(interval)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="1d">24 hours</SelectItem>
                            <SelectItem value="7d">7 days</SelectItem>
                            <SelectItem value="30d">30 days</SelectItem>
                            <SelectItem value="90d">90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="transition" style={{ opacity: loading ? 0.6 : 1 }}>
                <div className="w-full mb-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-3 gap-10 items-end">
                                <div>
                                    <div className="text-sm sm:text-lg">
                                        Views
                                    </div>
                                    <div className="text-4xl">
                                        {countFormatter.format(data.views)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm sm:text-lg">
                                        Visits
                                    </div>
                                    <div className="text-4xl">
                                        {countFormatter.format(data.visits)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm sm:text-lg">
                                        Visitors
                                    </div>
                                    <div className="text-4xl">
                                        {countFormatter.format(data.visitors)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="w-full mb-4">
                    <Card>
                        <CardContent>
                            <div className="h-80 pt-6 -m-4 -ml-8 sm:m-0">
                                <TimeSeriesChart
                                    data={chartData}
                                    intervalType={data.intervalType}
                                ></TimeSeriesChart>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <TableCard
                        countByProperty={data.countByPath}
                        columnHeaders={["Page", "Visitors", "Views"]}
                    />
                    <TableCard
                        countByProperty={data.countByReferrer}
                        columnHeaders={["Referrer", "Visitors"]}
                    />
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <TableCard
                        countByProperty={data.countByBrowser}
                        columnHeaders={["Browser", "Visitors"]}
                    />
                    <TableCard
                        countByProperty={data.countByCountry}
                        columnHeaders={["Country", "Visitors"]}
                    />
                    <TableCard
                        countByProperty={data.countByDevice}
                        columnHeaders={["Device", "Visitors"]}
                    ></TableCard>
                </div>
            </div>
        </div>
    );
}
