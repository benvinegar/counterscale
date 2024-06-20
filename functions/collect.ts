import { collectRequestHandler } from "~/analytics/collect";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
    return collectRequestHandler(request, env);
};
