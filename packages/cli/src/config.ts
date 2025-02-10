import path, { dirname } from "path";
import fs, { existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "url";
import { $ } from "zx";

export const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");

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

export async function createDotDirectory(): Promise<boolean> {
    try {
        await $`test -d ${COUNTERSCALE_DIR}`;
        return false;
    } catch {
        await $`mkdir -p ${COUNTERSCALE_DIR}`;
        return true;
    }
}

export function getWorkerAndDatasetName(config: ReturnType<typeof JSON.parse>) {
    return {
        workerName: config.name as string,
        analyticsDataset: config.analytics_engine_datasets[0].dataset,
    };
}

/**
 * Reads the initial server config from the @counterscale/server package
 */
export function readInitialServerConfig() {
    const serverPkgDir = getServerPkgDir();
    const distConfig = JSON.parse(
        fs.readFileSync(path.join(serverPkgDir, "wrangler.json"), "utf8"),
    );

    return distConfig;
}

/**
 * Writes a local copy of wrangler.json (in ~/.counterscale) where all the paths are
 * converted to be absolute. This makes it so that the `wrangler deploy` command can be
 * run from any directory.
 */

export async function stageDeployConfig(
    targetPath: string,
    initialDeployConfig: ReturnType<typeof JSON.parse>,
    workerName: string,
    analyticsDataset: string,
): Promise<void> {
    const serverPkgDir = getServerPkgDir();

    const updatedConfig = makePathsAbsolute(initialDeployConfig, serverPkgDir);
    initialDeployConfig.name = workerName;
    initialDeployConfig.analytics_engine_datasets[0].dataset = analyticsDataset;

    fs.writeFileSync(targetPath, JSON.stringify(updatedConfig, null, 2));
}
