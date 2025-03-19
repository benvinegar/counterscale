import { fixupPluginRules } from "@eslint/compat";

import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
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
    tsconfigRootDir = "./",
    project = undefined,
} = {}) {
    const parserOptions = {
        tsconfigRootDir,
    };

    if (project) {
        parserOptions.project = project;
    }

    return [
        tseslint.config(tseslint.configs.recommended),
        importPlugin.flatConfigs.recommended,
        {
            files: ["**/*.{ts,tsx}"],

            plugins: {
                "typescript-eslint": fixupPluginRules(tseslint),
                "eslint-plugin-import": fixupPluginRules(importPlugin),
            },

            languageOptions: {
                parser: tsParser,
                parserOptions,
            },

            settings: {
                "import/internal-regex": "^~/",

                "import/resolver": {
                    node: {
                        extensions: [".ts", ".tsx"],
                    },

                    typescript: {
                        alwaysTryTypes: true,
                    },
                },
            },

            rules: {
                "@typescript-eslint/no-explicit-any": 1,
                "no-unused-vars": 0,

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
