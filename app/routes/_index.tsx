import { Button } from "~/components/ui/button"
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from "~/components/ui/card"


import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { AnalyticsEngineAPI } from "../analytics/query";

export const meta: MetaFunction = () => {
    return [
        { title: "New Remix App" },
        { name: "description", content: "Welcome to Remix!" },
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

export const loader = async ({ context }: LoaderFunctionArgs) => {
    const analyticsEngine = new AnalyticsEngineAPI(context.env.CF_ACCOUNT_ID, context.env.CF_BEARER_TOKEN);

    const days = 7;
    const count = analyticsEngine.getCount(days);
    const countByPath = analyticsEngine.getCountByPath(days);
    // const countByUserAgent = analyticsEngine.getCountByUserAgent(days);
    const countByCountry = analyticsEngine.getCountByCountry(days);
    const countByReferrer = analyticsEngine.getCountByReferrer(days);
    const countByBrowser = analyticsEngine.getCountByBrowser(days);

    return json({
        count: await count,
        countByPath: await countByPath,
        countByBrowser: await countByBrowser,
        countByCountry: await countByCountry,
        countByReferrer: await countByReferrer
    });
};

export default function Index() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>

            <h1 className="text-3xl mb-4">
                Tallyho
            </h1>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Hits</CardTitle>
                    </CardHeader>
                    <CardContent>{data.count}</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Visits</CardTitle>
                    </CardHeader>
                    <CardContent>n/a</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Bounce Rate</CardTitle>
                    </CardHeader>
                    <CardContent>n/a</CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul>
                            {data.countByPath.map((item: any) => (
                                <li key={item[0]}>{item[0]}: {item[1]}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Referrers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul>
                            {data.countByReferrer.map((item: any) => ( // Update this line
                                <li key={item[0]}>{item[0]}: {item[1]}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Browsers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul>
                            {data.countByBrowser.map((item: any) => (
                                <li key={item[0]}>{item[0]}: {item[1]}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Devices</CardTitle>
                    </CardHeader>
                    <CardContent>n/a</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul>
                            {data.countByCountry.map((item: any) => (
                                <li key={item[0]}>{item[0]}: {item[1]}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
