import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a React ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.baseDirectory - The base directory for the configuration
 * @returns {Array} ESLint configuration array
 */
export default function createReactConfig({ baseDirectory = __dirname } = {}) {
    const compat = new FlatCompat({
        baseDirectory,
    });

    return [
        ...fixupConfigRules(
            compat.extends(
                "plugin:react/recommended",
                "plugin:react/jsx-runtime",
                "plugin:react-hooks/recommended",
                "plugin:jsx-a11y/recommended",
            ),
        ).map((config) => ({
            ...config,
            files: ["**/*.{js,jsx,ts,tsx}"],
        })),
        {
            files: ["**/*.{js,jsx,ts,tsx}"],

            plugins: {
                react: fixupPluginRules(react),
                "jsx-a11y": fixupPluginRules(jsxA11Y),
            },

            languageOptions: {
                parserOptions: {
                    ecmaFeatures: {
                        jsx: true,
                    },
                },
            },

            settings: {
                react: {
                    version: "detect",
                },

                formComponents: ["Form"],

                linkComponents: [
                    {
                        name: "Link",
                        linkAttribute: "to",
                    },
                    {
                        name: "NavLink",
                        linkAttribute: "to",
                    },
                ],
            },
        },
    ];
}
