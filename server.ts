import type { RequestInit } from "@cloudflare/workers-types";

import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { createRequestHandler, logDevReady } from "@remix-run/cloudflare";

import { AnalyticsEngineAPI } from "./app/analytics/query";
import { collectRequestHandler } from "./app/analytics/collect";

import * as build from "@remix-run/dev/server-build";
// eslint-disable-next-line import/no-unresolved
import __STATIC_CONTENT_MANIFEST from "__STATIC_CONTENT_MANIFEST";

const MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST);
const handleRemixRequest = createRequestHandler(build, process.env.NODE_ENV);

if (process.env.NODE_ENV === "development") {
    logDevReady(build);
}

export default {
    async fetch(
        request: Request,
        env: Environment & { VERSION: string },
        ctx: ExecutionContext,
    ): Promise<Response> {
        try {
            const url = new URL(request.url);

            if (url.pathname.startsWith("/collect")) {
                return collectRequestHandler(request, env);
            }

            const ttl = url.pathname.startsWith("/build/")
                ? 60 * 60 * 24 * 365 // 1 year
                : 60 * 5; // 5 minutes

            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                } as FetchEvent,
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: MANIFEST,
                    cacheControl: {
                        browserTTL: ttl,
                        edgeTTL: ttl,
                    },
                },
            );
        } catch (error) {
            // No-op
        }

        if (!env.CF_BEARER_TOKEN || !env.CF_ACCOUNT_ID) {
            throw new Error("Missing Cloudflare credentials");
        }
        try {
            const analyticsEngine = new AnalyticsEngineAPI(
                env.CF_ACCOUNT_ID,
                env.CF_BEARER_TOKEN,
            );
            const loadContext: AppLoadContext = {
                analyticsEngine,
                env,
                requestTimezone: (request as RequestInit).cf
                    ?.timezone as string,
            };
            return await handleRemixRequest(request, loadContext);
        } catch (error) {
            console.log(error);
            return new Response("An unexpected error occurred", {
                status: 500,
            });
        }
    },
};
