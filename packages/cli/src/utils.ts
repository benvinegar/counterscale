import shell from "shelljs";
import path from "path";
import { existsSync } from "node:fs";

/**
 * Finds the directory of the @counterscale/server package.
 * @returns The path to the @counterscale/server package directory.
 */
export function getServerPkgDir(): string {
    const npmRoot = shell.exec("npm root", {
        silent: true,
    }).stdout;

    // 1) first check local node_modules dir (using "npm root")
    const nodeModulePath = path.join(npmRoot.trim(), "@counterscale", "server");

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
