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
import { useLoaderData, useSearchParams } from "@remix-run/react";

import { AnalyticsEngineAPI } from "../analytics/query";

import TableCard from "~/components/TableCard";
import TimeSeriesChart from "~/components/TimeSeriesChart";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

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
        interval = url.searchParams.get("interval") || "7";
        interval = Number(interval);
    } catch (err) {
        interval = 7;
    }

    // if no siteId is set, redirect to the site with the most hits
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

    // initiate requests to AE in parallel
    const sitesByHits = analyticsEngine.getSitesOrderedByHits(interval);
    const counts = analyticsEngine.getCounts(actualSiteId, interval);
    const countByPath = analyticsEngine.getCountByPath(actualSiteId, interval);
    const countByCountry = analyticsEngine.getCountByCountry(
        actualSiteId,
        interval,
    );
    const countByReferrer = analyticsEngine.getCountByReferrer(
        actualSiteId,
        interval,
    );
    const countByBrowser = analyticsEngine.getCountByBrowser(
        actualSiteId,
        interval,
    );
    const countByDevice = analyticsEngine.getCountByDevice(
        actualSiteId,
        interval,
    );

    let intervalType = "DAY";
    switch (interval) {
        case 1:
            intervalType = "HOUR";
            break;
        case 7:
            intervalType = "DAY";
            break;
        case 30:
            intervalType = "DAY";
            break;
        case 90:
            intervalType = "DAY";
            break;
    }

    const tz = context.requestTimezone as string;

    const viewsGroupedByInterval = analyticsEngine.getViewsGroupedByInterval(
        actualSiteId,
        intervalType,
        interval,
        tz,
    );

    // await all requests to AE then return the results
    return json({
        siteId: siteId,
        sites: (await sitesByHits).map(([site, _]: [string, number]) => site),
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
    });
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

    const countByCountryName = convertCountryCodesToNames(data.countByCountry);

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
                        defaultValue="7"
                        onValueChange={(interval) => changeInterval(interval)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="w-full mb-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-3 gap-10 items-end">
                            <div>
                                <div className="text-sm sm:text-lg">Views</div>
                                <div className="text-4xl">{data.views}</div>
                            </div>
                            <div>
                                <div className="text-sm sm:text-lg">Visits</div>
                                <div className="text-4xl">{data.visits}</div>
                            </div>
                            <div>
                                <div className="text-sm sm:text-lg">
                                    Visitors
                                </div>
                                <div className="text-4xl">{data.visitors}</div>
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
                    columnHeaders={["Page", "Visitors"]}
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
                    countByProperty={countByCountryName}
                    columnHeaders={["Country", "Visitors"]}
                />

                <TableCard
                    countByProperty={data.countByDevice}
                    columnHeaders={["Device", "Visitors"]}
                ></TableCard>
            </div>
        </div>
    );
}
