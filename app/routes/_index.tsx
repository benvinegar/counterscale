import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    env: {
      CF_BEARER_TOKEN: string
    };
  }
}

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${context.env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    body: "SELECT COUNT() as count FROM metricsDataset",
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "X-Source": "Cloudflare-Workers",
      "Authorization": `Bearer ${context.env?.CF_BEARER_TOKEN}`
    },
  });

  const responseData: any = await response.json();


  return json({ test: "testing", count: responseData.data[0].count });
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>{data.count}</li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}
