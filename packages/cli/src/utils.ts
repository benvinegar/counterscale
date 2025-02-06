import path from "path";
import { existsSync } from "node:fs";

import { fileURLToPath } from "url";
import { dirname } from "path";

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
