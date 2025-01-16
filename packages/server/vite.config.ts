import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { getLoadContext } from "./app/load-context";

export default defineConfig({
    server: {
        port: 3005,
    },
    plugins: [
        cloudflareDevProxy({ getLoadContext }),
        !process.env.VITEST && reactRouter(),
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
