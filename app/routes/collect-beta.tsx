import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { collectRequestHandler } from "~/analytics/collect";

export async function loader({ request, context }: LoaderFunctionArgs) {
    return collectRequestHandler(request, context.cloudflare.env);
}
