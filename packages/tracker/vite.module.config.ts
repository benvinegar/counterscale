/**
 * Build script for publishing the tracker as an importable JavaScript
 * module/library.
 * */
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        outDir: "dist/module",
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "index",
            fileName: "index",
        },
    },
    plugins: [
        tsconfigPaths(),
        dts({
            tsconfigPath: resolve(__dirname, "tsconfig.json"),
            insertTypesEntry: true,
            entryRoot: resolve(__dirname, "src"),
            exclude: [
                "node_modules/**",
                "dist",
                "integration",
                "**/*.config.ts",
                "src/tracker.ts", // omit loader script from dts
            ],
        }),
    ],
});
