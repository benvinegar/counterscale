import { type AppLoadContext } from "@remix-run/cloudflare";
import { type PlatformProxy } from "wrangler";
import { AnalyticsEngineAPI } from "./app/analytics/query";

interface ExtendedEnv extends Env {
    CF_PAGES_COMMIT_SHA: string;
}

type Cloudflare = Omit<PlatformProxy<ExtendedEnv>, "dispose">;

declare module "@remix-run/cloudflare" {
    interface AppLoadContext {
        cloudflare: Cloudflare;
        analyticsEngine: AnalyticsEngineAPI;
    }
}

// declare module "@remix-run/server-runtime" {
//     export interface AppLoadContext {
//         analyticsEngine: AnalyticsEngineAPI;
//         env: {
//             VERSION: string;
//             CF_BEARER_TOKEN: string;
//             CF_ACCOUNT_ID: string;
//         };
//     }
// }

type GetLoadContext = (args: {
    request: Request;
    context: { cloudflare: Cloudflare }; // load context _before_ augmentation
}) => AppLoadContext;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = ({ context }) => {
    if (
        !context.cloudflare.env.CF_BEARER_TOKEN ||
        !context.cloudflare.env.CF_ACCOUNT_ID
    ) {
        throw new Error("Missing Cloudflare credentials");
    }

    const analyticsEngine = new AnalyticsEngineAPI(
        context.cloudflare.env.CF_ACCOUNT_ID,
        context.cloudflare.env.CF_BEARER_TOKEN,
    );

    return {
        ...context,
        analyticsEngine: analyticsEngine,
    };
};
