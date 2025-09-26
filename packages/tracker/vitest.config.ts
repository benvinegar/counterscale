// vitest.config.ts
import { defineConfig, coverageConfigDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    test: {
        exclude: ["integration"],
        coverage: {
            provider: "v8", // or 'v8'
            exclude: [
                "**/node_modules/**",
                "**/{playwright,vite.loader,vite.module,vite.server}.config.*",
                "src/tracker.ts", // covered by /integration tests
                "integration/**",
                ...coverageConfigDefaults.exclude,
            ],
        },
        environment: "jsdom",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tsconfigPaths() as any],
});
