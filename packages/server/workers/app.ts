import type { 
    ExecutionContext,
    ExportedHandler,
    ScheduledController,
} from "@cloudflare/workers-types";
import { createRequestHandler, type ServerBuild } from "react-router";

/**
 * NOTE: Must use relative paths inside this file (no ~ shorthand), because
 * it gets packaged into Worker and special paths defined in tsconfig will not
 * resolve.
 */
import { getLoadContext } from "../app/load-context";
import * as build from "../build/server";
import { extractAsArrow } from "./lib/arrow";

const requestHandler = createRequestHandler(build as unknown as ServerBuild);

export default {
        async scheduled(
        _controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ) {
        if (env.CF_STORAGE_ENABLED === "false") return
        try {
            ctx.waitUntil(
                extractAsArrow(
                    {
                        accountId: env.CF_ACCOUNT_ID,
                        bearerToken: env.CF_BEARER_TOKEN,
                    },
                    env.DAILY_ROLLUPS,
                ),
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
                            props: ctx.props,
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
