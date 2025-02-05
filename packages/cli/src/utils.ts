import { getInstalledPathSync } from "get-installed-path";
import path from "path";
import { existsSync } from "node:fs";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Finds the directory of the @counterscale/server package.
 * @returns The path to the @counterscale/server package directory.
 */
export function getServerPkgDir(): string {
    // 1) first check local node_modules dir (using "npm root")
    let nodeModulePath = "";
    try {
        nodeModulePath = getInstalledPathSync("@counterscale/server");
    } catch {
        // ignore
    }
    if (existsSync(nodeModulePath)) {
        return nodeModulePath;
    }

    // 2) if not found, check root project directory (e.g. if this is a monorepo checkout)
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

    throw new Error(
        "Could not find @counterscale/server package. Is it installed?",
    );
}
