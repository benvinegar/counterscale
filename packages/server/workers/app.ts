import type { ExportedHandler } from "@cloudflare/workers-types";
import { createRequestHandler, type ServerBuild } from "react-router";
import type {
    ScheduledController,
    ExecutionContext,
} from "@cloudflare/workers-types";

import { extractAsParquet } from "./lib/dump";
import { getLoadContext } from "~/load-context";

import * as build from "../build/server";

const requestHandler = createRequestHandler(build as unknown as ServerBuild);

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ) {
        try {
            ctx.waitUntil(
                extractAsParquet({
                    accountId: env.CF_ACCOUNT_ID,
                    bearerToken: env.CF_BEARER_TOKEN,
                }),
            );
        } catch (error) {
            console.error(error);
        }
    },

    // @ts-expect-error TODO figure out types here
    async fetch(request: any, env: any, ctx: any) {
        try {
            const loadContext = getLoadContext({
                request,
                context: {
                    cloudflare: {
                        ctx: {
                            waitUntil: ctx.waitUntil.bind(ctx),
                            passThroughOnException:
                                ctx.passThroughOnException.bind(ctx),
                        },
                        cf: request.cf as never,
                        // @ts-expect-error TODO: figure out how to get this type to work
                        caches,
                        env,
                    },
                },
            });
            return await requestHandler(request, loadContext);
        } catch (error) {
            console.log(error);
            return new Response("An unexpected error occurred", {
                status: 500,
            });
        }
    },
} satisfies ExportedHandler<Env>;
