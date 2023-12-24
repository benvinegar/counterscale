import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { AnalyticsEngineAPI } from "../analytics";

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

    const days = 1;
    const count = analyticsEngine.getCount(days);
    const countByUserAgent = analyticsEngine.getCountByUserAgent(days);
    const countByCountry = analyticsEngine.getCountByCountry(days);

    return json({
        count: await count,
        countByUserAgent: await countByUserAgent,
        countByCountry: await countByCountry,
    });
};

export default function Index() {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
            <h1>Welcome to Tally-ho</h1>

            <h2>Hits</h2>
            <ul>
                <li>Hits (all time): {data.count}</li>
            </ul>

            <h2>Hits by User Agent</h2>
            <ul>
                {data.countByUserAgent.map((item: any) => (
                    <li key={item[0]}>{item[0]}: {item[1]}</li>
                ))}
            </ul>

            <h2>Hits by Country</h2>
            <ul>
                {data.countByCountry.map((item: any) => (
                    <li key={item[0]}>{item[0]}: {item[1]}</li>
                ))}
            </ul>
        </div>
    );
}
