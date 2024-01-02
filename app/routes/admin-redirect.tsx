import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
    return redirect(`https://dash.cloudflare.com/${context.env.CF_ACCOUNT_ID}/workers/services/view/counterscale/production`);
};
