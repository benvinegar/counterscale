// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8", // or 'v8'
        },
    },
    plugins: [tsconfigPaths()],
});
