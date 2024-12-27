import { type AppLoadContext } from "@remix-run/cloudflare";
import { type PlatformProxy } from "wrangler";
import { AnalyticsEngineAPI } from "./analytics/query";

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

type GetLoadContext = (args: {
    request: Request;
    context: { cloudflare: Cloudflare }; // load context _before_ augmentation
}) => AppLoadContext;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = ({ context }) => {
    const analyticsEngine = new AnalyticsEngineAPI(
        context.cloudflare.env.CF_ACCOUNT_ID,
        context.cloudflare.env.CF_BEARER_TOKEN,
    );

    return {
        ...context,
        analyticsEngine: analyticsEngine,
    };
};
