import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "tracker",
        },
    },
    plugins: [
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
