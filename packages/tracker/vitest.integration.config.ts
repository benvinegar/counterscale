// vitest.integration.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    test: {
        include: ["**/integration/**/*.test.ts"],
        exclude: ["node_modules", "dist", "integration/playwright"],
        environment: "node",
        testTimeout: 10000,
        setupFiles: [],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tsconfigPaths() as any],
});
