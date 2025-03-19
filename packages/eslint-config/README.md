# @counterscale/eslint-config

Shared ESLint configurations for Counterscale packages.

## Usage

### Installation

This package is included as a dependency in the Counterscale monorepo.

### Standard Usage

Create a minimal `eslint.config.mjs` file in your package:

```js
import { createConfig } from "@counterscale/eslint-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default createConfig({
    baseDirectory: __dirname,
    ignores: [
        "build/*",
        "node_modules",
        "dist/*",
        // Add any package-specific ignores
    ],
    // Configure based on package type
    includeReact: true, // Set to true for React packages
    includeTypeScript: true, // Set to true for TypeScript packages
    tsconfigRootDir: "./",
    project: "./tsconfig.json", // Path to your tsconfig.json
    additionalGlobals: {
        // Add any package-specific globals
        counterscale: true,
    },
});
```

### Advanced Usage with Granular Control

For more granular control, you can import individual configurations:

```js
import {
    createBaseConfig,
    createTypeScriptConfig,
    createReactConfig,
} from "@counterscale/eslint-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    ...createBaseConfig({
        baseDirectory: __dirname,
        ignores: ["build/*", "node_modules", "dist/*"],
        additionalGlobals: { counterscale: true },
    }),
    ...createReactConfig({ baseDirectory: __dirname }),
    ...createTypeScriptConfig({
        baseDirectory: __dirname,
        tsconfigRootDir: "./",
        project: "./tsconfig.json",
    }),
    // Add any package-specific rules
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            // Your custom rules here
        },
    },
];
```
