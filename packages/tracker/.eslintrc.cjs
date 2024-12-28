/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true,
    },

    globals: {
        // tracker global on window
        counterscale: true,
    },

    // Base config
    extends: ["eslint:recommended"],

    overrides: [
        // Typescript
        {
            files: ["**/*.{ts,tsx}"],
            plugins: ["@typescript-eslint", "import"],
            parser: "@typescript-eslint/parser",
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
                // we're cool with explicit any (for now)
                "@typescript-eslint/no-explicit-any": 1,

                // https://stackoverflow.com/questions/68802881/get-rid-of-is-defined-but-never-used-in-function-parameter
                "no-unused-vars": 0,
                "@typescript-eslint/no-unused-vars": [
                    "error",
                    { argsIgnorePattern: "^_" },
                ],
            },
            extends: [
                "plugin:@typescript-eslint/recommended",
                "plugin:import/recommended",
                "plugin:import/typescript",
            ],
        },
    ],
};
