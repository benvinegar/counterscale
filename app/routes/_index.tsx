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
    const countByReferer = analyticsEngine.getCountByReferer(days);

    return json({
        test: "testing",
        count: await count,
        countByReferer: await countByReferer
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

            <h2>Hits by Referer</h2>
            <ul>
                {data.countByReferer.map((item: any) => (
                    <li key={item[0]}>{item[0]}: {item[1]}</li>
                ))}
            </ul>
        </div>
    );
}
