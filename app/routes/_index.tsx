import { Card, CardTitle, CardDescription, CardContent, CardHeader } from "~/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select"

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";

import { AnalyticsEngineAPI } from "../analytics/query";

import BrowserCard from "~/components/BrowserCard";
import CountryCard from "~/components/CountryCard";
import TableCard from "~/components/TableCard";

export const meta: MetaFunction = () => {
    return [
        { title: "Web Analytics" },
        { name: "description", content: "Tallyho analytics" },
    ];
};

declare module "@remix-run/server-runtime" {
    export interface AppLoadContext {
        env: {
            CF_BEARER_TOKEN: string,
            CF_ACCOUNT_ID: string
        };
    }
}

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
    const analyticsEngine = new AnalyticsEngineAPI(context.env.CF_ACCOUNT_ID, context.env.CF_BEARER_TOKEN);


    const url = new URL(request.url);
    let siteId = url.searchParams.get("site") || '';
    let interval;
    try {
        interval = url.searchParams.get("interval") || '7';
        interval = Number(interval);
    } catch (err) {
        interval = 7;
    }

    const sitesByHits = (await analyticsEngine.getSitesByHits(interval));

    if (!siteId) {
        // pick first non-empty site
        siteId = sitesByHits[0][0];
    }

    let actualSiteId = siteId == '@unknown' ? '' : siteId;

    const counts = analyticsEngine.getCounts(actualSiteId, interval);
    const countByPath = analyticsEngine.getCountByPath(actualSiteId, interval);
    const countByCountry = analyticsEngine.getCountByCountry(actualSiteId, interval);
    const countByReferrer = analyticsEngine.getCountByReferrer(actualSiteId, interval);
    const countByBrowser = analyticsEngine.getCountByBrowser(actualSiteId, interval);
    const countByDevice = analyticsEngine.getCountByDevice(actualSiteId, interval);

    return json({
        siteId: siteId || '@unknown',
        sites: sitesByHits.map(([site,]: [string,]) => site),
        views: (await counts).views,
        visits: (await counts).visits,
        countByPath: await countByPath,
        countByBrowser: await countByBrowser,
        countByCountry: await countByCountry,
        countByReferrer: await countByReferrer,
        countByDevice: await countByDevice
    });
};

export default function Index() {
    const [searchParams, setSearchParams] = useSearchParams();

    const data = useLoaderData<typeof loader>();
    let navigate = useNavigate()

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

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>

            <h1 className="text-3xl mb-4">
                Web Analytics
            </h1>

            <div className="w-full mb-4 items-stretch flex">

                <div className="flex-none w-1/6 mr-4">
                    <Select defaultValue={data.siteId} onValueChange={(site) => changeSite(site)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {/* SelectItem explodes if given an empty string for `value` so coerce to @unknown */}
                            {data.sites.map((siteId: string) =>
                                <SelectItem key={`k-${siteId}`} value={siteId || '@unknown'}>{siteId || '(unknown)'}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-none w-1/6">

                    <Select defaultValue="7" onValueChange={(interval) => changeInterval(interval)}>
                        <SelectTrigger className="w-[180px]">
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
                        <div className="grid grid-cols-3 gap-10">
                            <div>
                                <div className="text-muted-foreground">Page Views</div>
                                <div className="text-4xl">{data.views}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Visitors</div>
                                <div className="text-4xl">{data.visits}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <TableCard countByProperty={data.countByPath} columnHeaders={["Page", "Page Views"]} />

                <TableCard countByProperty={data.countByReferrer} columnHeaders={["Referrer", "Page Views"]} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <TableCard countByProperty={data.countByBrowser} columnHeaders={["Browser", "Page Views"]} />

                <TableCard countByProperty={data.countByCountry} columnHeaders={["Country", "Page Views"]} />

                <TableCard countByProperty={data.countByDevice} columnHeaders={["Device", "Page Views"]}></TableCard>
            </div>
        </div>
    );
}
