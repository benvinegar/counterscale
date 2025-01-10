/**
 * Build script for bundling the tracker into a single self-executing
 * script to be loaded via a script tag.
 * */
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist/loader",
        lib: {
            entry: resolve(__dirname, "src/tracker.ts"),
            name: "tracker",
        },
        rollupOptions: {
            output: {
                exports: "none",
            },
        },
    },
    plugins: [
        tsconfigPaths(),
        {
            name: "wrap-in-iife",
            generateBundle(outputOptions, bundle) {
                Object.keys(bundle).forEach((fileName) => {
                    const file = bundle[fileName];
                    if (fileName.slice(-3) === ".js" && "code" in file) {
                        file.code = `(() => {\n${file.code}})()`;
                    }
                });
            },
        },
    ],
});
