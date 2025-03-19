import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a React ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.baseDirectory - The base directory for the configuration
 * @returns {Array} ESLint configuration array
 */
export default function createReactConfig({ baseDirectory = __dirname } = {}) {
    return [
        reactPlugin.configs.flat.recommended,
        reactPlugin.configs.flat["jsx-runtime"],
        reactHooksPlugin.configs["recommended-latest"],
        jsxA11Y.flatConfigs.recommended,
        {
            files: ["**/*.{js,jsx,ts,tsx}"],
            settings: {
                react: {
                    version: "detect",
                },
            },
            languageOptions: {
                parserOptions: {
                    ecmaFeatures: {
                        jsx: true,
                    },
                },
            },
        },
    ];
}
