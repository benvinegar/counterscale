import createBaseConfig from "./base.js";
import createTypeScriptConfig from "./typescript.js";
import createReactConfig from "./react.js";
import globals from "globals";

/**
 * Creates a complete ESLint configuration
 * @param {Object} options - Configuration options
 * @param {string} options.baseDirectory - The base directory for the configuration
 * @param {string[]} options.ignores - Patterns to ignore
 * @param {Object} options.additionalGlobals - Additional globals to include
 * @param {boolean} options.includeReact - Whether to include React configuration
 * @param {boolean} options.includeTypeScript - Whether to include TypeScript configuration
 * @param {string} options.tsconfigRootDir - The root directory for the tsconfig
 * @param {string} options.project - The path to the tsconfig file
 * @returns {Array} ESLint configuration array
 */
export function createConfig({
    baseDirectory,
    ignores = ["build/*", "node_modules", "dist/*"],
    additionalGlobals = {},
    includeReact = false,
    includeTypeScript = true,
    tsconfigRootDir,
    project,
} = {}) {
    let configs = [];

    // Add base config
    configs.push(
        ...createBaseConfig({
            baseDirectory,
            ignores,
            additionalGlobals: {
                ...additionalGlobals,
                ...(includeReact ? globals.browser : {}),
            },
        }),
    );

    // Add React config if needed
    if (includeReact) {
        configs.push(
            ...createReactConfig({
                baseDirectory,
            }),
        );
    }

    // Add TypeScript config if needed
    if (includeTypeScript) {
        configs = configs.concat(
            ...createTypeScriptConfig({
                tsconfigRootDir,
                project,
            }),
        );
    }

    return configs;
}

// Export individual configurations for more granular usage
export { createBaseConfig, createTypeScriptConfig, createReactConfig };
