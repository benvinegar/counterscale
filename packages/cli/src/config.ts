import path, { dirname } from "path";
import { existsSync } from "node:fs";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

/**
 * Finds the directory of the @counterscale/server package.
 * @returns The path to the @counterscale/server package directory.
 */
export function getServerPkgDir(): string {
    const __dirname = dirname(__filename);

    // 1) first check root project directory (e.g. if this is a monorepo checkout)
    const monoRepoPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "packages",
        "server",
    );

    if (existsSync(monoRepoPath)) {
        return monoRepoPath;
    }

    // 2) next check common node_modules directory (if this is npm installed)
    const nodeModulesDir = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "@counterscale",
        "server",
    );
    if (existsSync(nodeModulesDir)) {
        return nodeModulesDir;
    }

    throw new Error(
        "Could not find @counterscale/server package. Is it installed?",
    );
}

// Recursively convert all relative paths to absolute
export const makePathsAbsolute = (
    obj: ReturnType<typeof JSON.parse>,
    fullDir: string,
): ReturnType<typeof JSON.parse> => {
    if (!obj || typeof obj !== "object") return obj;

    const result: ReturnType<typeof JSON.parse> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (
            typeof value === "string" &&
            value.includes("/") &&
            !path.isAbsolute(value)
        ) {
            result[key] = path.join(fullDir, value);
        } else if (Array.isArray(value)) {
            result[key] = value.map((v) => makePathsAbsolute(v, fullDir));
        } else if (typeof value === "object") {
            result[key] = makePathsAbsolute(value, fullDir);
        } else {
            result[key] = value;
        }
    }

    return result;
};
