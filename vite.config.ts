import {
    vitePlugin as remix,
    cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { getLoadContext } from "./load-context";

export default defineConfig({
    server: {
        port: 3005,
    },
    plugins: [
        remixCloudflareDevProxy({ getLoadContext }),
        remix(),
        !process.env.VITEST &&
            remix({
                ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
                serverModuleFormat: "esm",
                future: {
                    v3_fetcherPersist: true,
                    v3_relativeSplatPath: true,
                    v3_throwAbortReason: true,
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
