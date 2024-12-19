import {
    vitePlugin as remix,
    cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { getLoadContext } from "./app/load-context";

export default defineConfig({
    server: {
        port: 3005,
    },
    plugins: [
        remixCloudflareDevProxy({ getLoadContext }),
        !process.env.VITEST &&
            remix({
                ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
                serverModuleFormat: "esm",
                future: {
                    v3_fetcherPersist: true,
                    v3_relativeSplatPath: true,
                    v3_throwAbortReason: true,
                    v3_routeConfig: true,
                    v3_lazyRouteDiscovery: true,
                    v3_singleFetch: true,
                },
            }),
        tsconfigPaths(),
    ],
    ssr: {
        resolve: {
            externalConditions: ["workerd", "worker"],
        },
    },
    test: {
        environment: "happy-dom",
        // Additionally, this is to load ".env.test" during vitest
        env: loadEnv("test", process.cwd(), ""),
    },
});
