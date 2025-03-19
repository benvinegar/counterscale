import globals from "globals";
import { fixupConfigRules } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a base ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.baseDirectory - The base directory for the configuration
 * @param {string[]} options.ignores - Patterns to ignore
 * @param {Object} options.additionalGlobals - Additional globals to include
 * @returns {Array} ESLint configuration array
 */
export default function createBaseConfig({
    baseDirectory = __dirname,
    ignores = ["build/*", "node_modules", "dist/*"],
    additionalGlobals = {},
} = {}) {
    const compat = new FlatCompat({
        baseDirectory,
        recommendedConfig: js.configs.recommended,
        allConfig: js.configs.all,
    });

    return [
        {
            ignores,
        },
        ...compat.extends("eslint:recommended"),
        {
            languageOptions: {
                globals: {
                    ...globals.commonjs,
                    ...globals.node,
                    ...additionalGlobals,
                },
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
    ];
}
