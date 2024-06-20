import { collectRequestHandler } from "~/analytics/collect";

export async function onRequest(request: Request, env: Env) {
    return collectRequestHandler(request, env);
}
