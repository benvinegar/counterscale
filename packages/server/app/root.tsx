/// <reference types="vite/client" />
import styles from "./globals.css?url";
import { LoaderFunctionArgs, type LinksFunction } from "@remix-run/cloudflare";

import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "@remix-run/react";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader = ({ context, request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    return {
        version: context.cloudflare?.env?.CF_PAGES_COMMIT_SHA,
        origin: url.origin,
        url: request.url,
    };
};

export const Layout = ({ children = [] }: { children: React.ReactNode }) => {
    const data = useLoaderData<typeof loader>() ?? {
        version: "unknown",
        origin: "counterscale.dev",
        url: "https://counterscale.dev/",
    };

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" type="image/x-icon" href="/favicon.png" />

                <meta property="og:url" content={data.url} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Counterscale" />
                <meta
                    property="og:description"
                    content="Scalable web analytics you run yourself on Cloudflare"
                />
                <meta
                    property="og:image"
                    content={data.origin + "/counterscale-og-large.webp"}
                />

                <meta name="twitter:card" content="summary_large_image" />
                <meta property="twitter:domain" content="counterscale.dev" />
                <meta property="twitter:url" content={data.url} />
                <meta name="twitter:title" content="Counterscale" />
                <meta
                    name="twitter:description"
                    content="Scalable web analytics you run yourself on Cloudflare"
                />
                <meta
                    name="twitter:image"
                    content={data.origin + "/counterscale-og-large.webp"}
                />
                <Meta />
                <Links />
            </head>
            <body>
                <div className="container mx-auto pl-2 pr-2 sm:pl-8 sm:pr-8">
                    {children}
                </div>
                <ScrollRestoration />
                <Scripts />
                <script
                    id="counterscale-script"
                    data-site-id="counterscale-dev"
                    src="/tracker.js"
                ></script>
            </body>
        </html>
    );
};

export default function App() {
    const data = useLoaderData<typeof loader>();

    return (
        <div className="mt-0 sm:mt-4">
            <header className="border-b-2 mb-8 py-2">
                <nav className="flex justify-between items-center">
                    <div className="flex items-center">
                        <a href="/" className="text-lg font-bold">
                            Counterscale
                        </a>
                        <img
                            className="w-6 ml-1"
                            src="/img/arrow.svg"
                            alt="Counterscale Icon"
                        />
                    </div>
                    <div className="flex items-center font-small font-medium text-md">
                        <a href="/dashboard">Dashboard</a>
                        <a
                            href="/admin-redirect"
                            target="_blank"
                            className="hidden sm:inline-block ml-2"
                        >
                            Admin
                        </a>
                        <a
                            href="https://github.com/benvinegar/counterscale"
                            className="w-6 ml-2"
                        >
                            <img
                                src="/github-mark.svg"
                                alt="GitHub Logo"
                                style={{
                                    filter: "invert(21%) sepia(27%) saturate(271%) hue-rotate(113deg) brightness(97%) contrast(97%)",
                                }}
                            />
                        </a>
                    </div>
                </nav>
            </header>
            <main role="main" className="w-full">
                <Outlet />
            </main>

            <footer className="py-4 flex justify-end text-s">
                <div>
                    Version{" "}
                    <a
                        href={`https://github.com/benvinegar/counterscale/commit/${data.version}`}
                    >
                        {data.version?.slice(0, 7)}
                    </a>
                </div>
            </footer>
        </div>
    );
}
