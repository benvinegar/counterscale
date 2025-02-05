/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest",
    },
    env: {
        node: true,
    },

    // Base config
    extends: ["eslint:recommended"],

    overrides: [
        // Typescript
        {
            files: ["**/*.{ts,tsx}"],
            plugins: ["@typescript-eslint", "import"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                tsconfigRootDir: "./",
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
