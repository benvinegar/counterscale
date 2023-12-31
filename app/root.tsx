import styles from "./globals.css"
import type { LinksFunction } from "@remix-run/cloudflare";
import { cssBundleHref } from "@remix-run/css-bundle";
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "@remix-run/react";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: styles },
    ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export default function App() {

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body>
                <div className="container mx-auto mt-8">

                    <main role="main" className="w-full">
                        <Outlet />
                    </main>
                </div>
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
                <script dangerouslySetInnerHTML={{ __html: "window.counterscale = {'q': [['set', 'siteId', 'counterscale-dev'], ['trackPageview']] };" }}></script>
                <script id="counterscale-script" src="/tracker.js"></script>
            </body>
        </html>
    );
}
