import { typescript } from "@counterscale/eslint-config";

export default [
    ...typescript,
    {
        files: ["**/*.ts", "**/*.tsx"],
        ignores: ["worker-configuration.d.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-debugger": "off",
            "no-console": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
];
