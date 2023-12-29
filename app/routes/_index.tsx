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
import { useLoaderData, useNavigate } from "@remix-run/react";
import { AnalyticsEngineAPI } from "../analytics/query";

import BrowserCard from "~/components/BrowserCard";
import CountryCard from "~/components/CountryCard";
import TableCard from "~/components/TableCard";

export const meta: MetaFunction = () => {
    return [
        { title: "Tallyho" },
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

    const days = 7;
    const sitesByHits = (await analyticsEngine.getSitesByHits(days));

    const url = new URL(request.url);
    let siteId = url.searchParams.get("site") || '';
    if (!siteId) {
        // pick first non-empty site
        siteId = sitesByHits[0][0];
    }

    let actualSiteId = siteId == '@unknown' ? '' : siteId;

    const counts = analyticsEngine.getCounts(actualSiteId, days);
    const countByPath = analyticsEngine.getCountByPath(actualSiteId, days);
    const countByCountry = analyticsEngine.getCountByCountry(actualSiteId, days);
    const countByReferrer = analyticsEngine.getCountByReferrer(actualSiteId, days);
    const countByBrowser = analyticsEngine.getCountByBrowser(actualSiteId, days);
    const countByDevice = analyticsEngine.getCountByDevice(actualSiteId, days);

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
    const data = useLoaderData<typeof loader>();
    let navigate = useNavigate()

    function changeSite(site: string) {
        navigate(`/?site=${site}`)
    }
    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>

            <h1 className="text-3xl mb-4">
                Tallyho
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

                    <Select defaultValue="7">
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

            <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Views</CardTitle>
                    </CardHeader>
                    <CardContent>{data.views}</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Visits</CardTitle>
                    </CardHeader>
                    <CardContent>{data.visits}</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Bounce Rate</CardTitle>
                    </CardHeader>
                    <CardContent>n/a</CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <TableCard countByProperty={data.countByPath} propertyName={"Page"} />

                <TableCard countByProperty={data.countByReferrer} propertyName={"Referrer"} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <TableCard countByProperty={data.countByBrowser} propertyName={"Browser"} />

                <TableCard countByProperty={data.countByCountry} propertyName={"Country"} />

                <TableCard countByProperty={data.countByDevice} propertyName={"Device"}></TableCard>
            </div>
        </div>
    );
}
