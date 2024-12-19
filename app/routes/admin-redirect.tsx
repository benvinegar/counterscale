import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";

export const loader = async ({ context }: LoaderFunctionArgs) => {
    return redirect(
        `https://dash.cloudflare.com/${context.cloudflare.env.CF_ACCOUNT_ID}/pages/view/counterscale`,
    );
};
