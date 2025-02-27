import globals from "globals";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: [
            "public/tracker.js",
            "build/*",
            "node_modules",
            "dist/*",
            ".react-router",
        ],
    },
    ...compat.extends("eslint:recommended"),
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: "latest",
            sourceType: "module",
        },
    },
    ...fixupConfigRules(
        compat.extends(
            "plugin:@typescript-eslint/recommended",
            "plugin:import/recommended",
            "plugin:import/typescript",
        ),
    ).map((config) => ({
        ...config,
        files: ["**/*.{ts,tsx}"],
    })),
    {
        files: ["**/*.{ts,tsx}"],

        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
            import: fixupPluginRules(_import),
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                tsconfigRootDir: "./",
            },
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
