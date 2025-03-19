import { createConfig } from "@counterscale/eslint-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default createConfig({
    baseDirectory: __dirname,
    ignores: ["public/tracker.js", "build/*", "node_modules", "dist/*"],
    includeReact: false,
    includeTypeScript: true,
    additionalGlobals: {
        counterscale: true,
        // Add browser globals since this is a browser-based package
        window: true,
        document: true,
    },
});
