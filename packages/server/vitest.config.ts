// vitest.config.ts
import { defineConfig, coverageConfigDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8", // or 'v8'
            exclude: [
                "build",
                "tailwind.config.ts",
                "public/tracker.js",
                ...coverageConfigDefaults.exclude,
            ],
        },
    },
    plugins: [tsconfigPaths()],
});
