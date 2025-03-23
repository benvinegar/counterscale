/// <reference types="vite/client" />
import styles from "./globals.css?url";
import { LoaderFunctionArgs, type LinksFunction } from "react-router";

import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "react-router";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/**
 * Generate GitHub information based on the version format
 * @param version - Version string (semver or git SHA)
 * @returns Object with GitHub URL and display version
 */
function getVersionMeta(version: string | null | undefined): {
    url: string | null;
    name: string | null;
} {
    if (!version) return { url: null, name: null };

    // Check if it's a semver (e.g., 1.2.3) or a git SHA
    const isSemver = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version);

    if (isSemver) {
        // Link to release page for semver
        return {
            url: `https://github.com/benvinegar/counterscale/releases/tag/v${version}`,
            name: version,
        };
    } else {
        // Link to commit for git SHA - show only first 7 characters
        return {
            url: `https://github.com/benvinegar/counterscale/commit/${version}`,
            name: version.slice(0, 7),
        };
    }
}

export const loader = ({ context, request }: LoaderFunctionArgs) => {
    // specified during deploy via wrangler --var VERSION:value
    const version = context.cloudflare?.env?.VERSION;

    return {
        version: {
            ...getVersionMeta(version),
        },
        origin: new URL(request.url).origin,
        url: request.url,
    };
};

export const Layout = ({ children = [] }: { children: React.ReactNode }) => {
    const data = useLoaderData<typeof loader>() ?? {
        version: "unknown",
        versionUrl: null,
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
                    {data.version ? (
                        <a
                            href={data.version.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                        >
                            {data.version.name}
                        </a>
                    ) : (
                        "unknown"
                    )}
                </div>
            </footer>
        </div>
    );
}
