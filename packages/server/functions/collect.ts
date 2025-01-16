import { collectRequestHandler } from "~/analytics/collect";
import type {
    PagesFunction,
    Response as CfResponse,
} from "@cloudflare/workers-types";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
    // Convert Cloudflare Request object to regular Request object
    const _request = request as unknown as Request;

    // Similarly, convert Response to Cloudflare Response type by adding
    // webSocket property
    const response = collectRequestHandler(
        _request,
        env,
    ) as unknown as CfResponse;

    return {
        ...response,
        webSocket: null,
    } as CfResponse;
};
