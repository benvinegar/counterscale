import { CounterscaleAnalyticsMCP } from "./agent/counterscale-agent.js";

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);

        if (url.pathname === "/sse" || url.pathname === "/sse/message") {
            return CounterscaleAnalyticsMCP.serveSSE("/sse").fetch(
                request,
                env,
                ctx,
            );
        }

        if (url.pathname === "/mcp") {
            return CounterscaleAnalyticsMCP.serve("/mcp").fetch(
                request,
                env,
                ctx,
            );
        }

        return new Response("Not found", { status: 404 });
    },
};
