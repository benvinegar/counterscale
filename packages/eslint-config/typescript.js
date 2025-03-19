import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";

import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a TypeScript ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.tsconfigRootDir - The root directory for the tsconfig
 * @param {string} options.project - The path to the tsconfig file
 * @returns {Array} ESLint configuration array
 */
export default function createTypeScriptConfig({
    baseDirectory,
    project = undefined,
} = {}) {
    return [
        tseslint.config(tseslint.configs.recommended),
        importPlugin.flatConfigs.recommended,
        {
            files: ["**/*.{ts,tsx}"],

            settings: {
                "import/internal-regex": "^~/",

                "import/resolver": {
                    typescript: {
                        alwaysTryTypes: true,
                        project: path.join(baseDirectory, project),
                    },
                },
            },

            rules: {
                "no-unused-vars": 0,
                "@typescript-eslint/no-explicit-any": 1,
                "@typescript-eslint/no-unused-vars": [
                    "error",
                    {
                        argsIgnorePattern: "^_",
                    },
                ],
            },
        },
    ];
}
