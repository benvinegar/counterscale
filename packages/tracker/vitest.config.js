// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    test: {
        exclude: ["integration"],
        coverage: {
            provider: "v8", // or 'v8'
        },
        browser: {
            enabled: true,
            provider: "playwright",
            name: "chromium",
            headless: true,
            screenshotFailures: false,
        },
    },
    plugins: [tsconfigPaths()],
});
