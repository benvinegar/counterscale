/**
 * Build script for publishing the tracker as a server-side Node.js module.
 * */
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        outDir: "dist/server",
        lib: {
            entry: resolve(__dirname, "src/server/index.ts"),
            name: "server",
            fileName: "index",
        },
        rollupOptions: {
            // No external dependencies needed - using Web APIs (fetch, URL, etc.)
        },
    },
    plugins: [
        tsconfigPaths(),
        dts({
            tsconfigPath: resolve(__dirname, "tsconfig.json"),
            insertTypesEntry: true,
            entryRoot: resolve(__dirname, "src/server"),
            exclude: [
                "node_modules/**",
                "dist",
                "integration",
                "**/*.config.ts",
                "src/index.ts", // exclude client code
                "src/tracker.ts", // exclude browser loader
                "src/lib/**", // exclude client lib
            ],
        }),
    ],
});
