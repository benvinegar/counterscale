#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import {
    intro,
    outro,
    password,
    text,
    confirm,
    spinner,
    note,
    isCancel,
    cancel,
} from "@clack/prompts";

import chalk from "chalk";
import { $ } from "zx";

import { getServerPkgDir, makePathsAbsolute } from "./config.js";

import {
    getAccountId,
    getCloudflareSecrets,
    syncSecrets,
    deploy,
} from "./cloudflare.js";

import {
    getTitle,
    getScriptSnippet,
    getPackageSnippet,
    info,
    CLI_COLORS,
} from "./ui.js";

import { ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");
const COUNTERSCALE_HOMEPAGE = "https://counterscale.dev";

const SERVER_PKG_DIR = getServerPkgDir();

let SERVER_PKG: ReturnType<typeof JSON.parse>;
try {
    SERVER_PKG = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "package.json"), "utf8"),
    );
} catch (err) {
    console.error("Error: Unable to parse server package.json");
    process.exit(1);
}

console.log(getTitle(SERVER_PKG.version, COUNTERSCALE_HOMEPAGE) + "\n");

yargs(hideBin(process.argv))
    .command(
        "install",
        "Configure and deploy to Cloudflare Workers",
        (yargs) => {
            yargs.option("advanced", {
                type: "boolean",
                default: false,
            });
        },
        async (argv) => {
            await install(argv);
        },
    )
    .options({
        verbose: {
            type: "boolean",
            default: false,
        },
    })
    .demandCommand(1)
    .parse();

function bail() {
    cancel("Operation canceled.");
    process.exit(0);
}

async function createDotDirectory(): Promise<boolean> {
    try {
        await $`test -d ${COUNTERSCALE_DIR}`;
        return false;
    } catch {
        await $`mkdir -p ${COUNTERSCALE_DIR}`;
        return true;
    }
}

async function promptApiToken(): Promise<string> {
    const cfApiToken = await password({
        message: "Enter your Cloudflare API Token",
        mask: "*",
        validate: (val) => {
            if (val.length === 0) {
                return "Value is required";
            } else if (val.length !== 40) {
                return "Value must be exactly 40 characters";
            } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
                return "Value must only have alphanumeric characters and underscores";
            }
        },
    });

    if (isCancel(cfApiToken)) {
        bail();
    }

    if (typeof cfApiToken !== "string") {
        throw new Error("API token is required");
    }

    return cfApiToken;
}

async function promptDeploy(counterscaleVersion: string): Promise<boolean> {
    const deploy = await confirm({
        message: `Do you want to deploy version ${counterscaleVersion} now?`,
        initialValue: false,
    });

    return deploy === true;
}

interface NewProjectAnswers {
    workerName: string;
    analyticsDataset: string;
}

async function promptProjectConfig(
    defaultWorkerName?: string,
    defaultAnalyticsDataset?: string,
): Promise<NewProjectAnswers> {
    const workerName = (await text({
        message:
            `What do you want to name your worker? ` +
            chalk.dim(`[default: ${defaultWorkerName}]`),
        initialValue: defaultWorkerName,
    })) as string;

    if (isCancel(workerName)) {
        bail();
    }

    const analyticsDataset = (await text({
        message:
            `What do you want to name your analytics dataset? ` +
            chalk.dim(`[default: ${defaultAnalyticsDataset}]`),
        initialValue: defaultAnalyticsDataset,
    })) as string;

    if (isCancel(analyticsDataset)) {
        bail();
    }

    return { workerName, analyticsDataset };
}

const TICK_LENGTH = 500;
async function tick(fn: () => void): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, TICK_LENGTH));
    fn();
}

/**
 * Reads the source wrangler.json from the server package directory, and does two things:
 *   1. Reads the worker name
 *   2. Creates a local copy of wrangler.json (in ~/.counterscale) where all the paths are
 *      converted to be absolute. This makes it so that the `wrangler deploy` command can be
 *      run from any directory.
 */
async function prepareDeployConfig(
    opts: Record<string, boolean | unknown>,
): Promise<{
    workerName: string;
    analyticsDataset: string;
}> {
    let workerName: string = "";
    let analyticsDataset: string = "";

    // check if wrangler.json in .counterscale dir
    const wranglerConfigPath = path.join(COUNTERSCALE_DIR, "wrangler.json");

    const distConfig = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "wrangler.json"), "utf8"),
    );

    const defaultWorkerName = distConfig.name;
    const defaultAnalyticsDataset =
        distConfig.analytics_engine_datasets[0].dataset;

    if (opts.advanced) {
        ({ workerName, analyticsDataset } = await promptProjectConfig(
            defaultWorkerName,
            defaultAnalyticsDataset,
        ));
    } else {
        workerName = distConfig.name as string;
        analyticsDataset = distConfig.analytics_engine_datasets[0].dataset;

        await tick(() =>
            info("Using worker:", chalk.rgb(...CLI_COLORS.teal)(workerName)),
        );

        await tick(() =>
            info(
                "Using analytics dataset: " +
                    chalk.rgb(...CLI_COLORS.teal)(analyticsDataset),
            ),
        );
    }
    // Update wrangler.json with worker name and analytics dataset
    const wranglerConfig = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "wrangler.json"), "utf8"),
    );
    wranglerConfig.name = workerName;
    wranglerConfig.analytics_engine_datasets[0].dataset = analyticsDataset;

    const updatedConfig = makePathsAbsolute(wranglerConfig, SERVER_PKG_DIR);

    fs.writeFileSync(
        wranglerConfigPath,
        JSON.stringify(updatedConfig, null, 2),
    );

    return { workerName, analyticsDataset };
}

/**
 * Main CLI install script, takes various user input (e.g. target worker name, Cloudflare API key, etc.)
 * and installs the CounterScale worker on Cloudflare.
 *
 * @param argv yargs-processed arguments
 */
async function install(argv: ArgumentsCamelCase): Promise<void> {
    intro("install");
    // convert argv to opts (Record)
    const opts = argv as Record<string, boolean | unknown>;

    let s = spinner();
    s.start("Fetching Cloudflare Account ID ...");
    const accountId = await getAccountId();

    if (!accountId) {
        s.stop("Not authenticated with Cloudflare.\n");
        info(`Run ${chalk.red(`npx wrangler login`)} first, then try again.`);
        process.exit(1);
    } else {
        s.stop(
            "Authenticated with Cloudflare using Account ID ending in: " +
                chalk.rgb(...CLI_COLORS.teal)(accountId.slice(-6)),
        );
    }

    if (argv.verbose) {
        await tick(() => {
            info(
                "Using server package found in: " +
                    chalk.rgb(...CLI_COLORS.teal)(SERVER_PKG_DIR),
            );
        });
    }

    if (await createDotDirectory()) {
        await tick(() => {
            info(
                "Created .counterscale in:",
                chalk.rgb(...CLI_COLORS.teal)(COUNTERSCALE_DIR),
            );
        });
    } else {
        if (argv.verbose) {
            await tick(() => {
                info(
                    "Using .counterscale found in:",
                    chalk.rgb(...CLI_COLORS.teal)(COUNTERSCALE_DIR),
                );
            });
        }
    }

    await prepareDeployConfig(opts);

    const secrets = await getCloudflareSecrets();

    if (Object.keys(secrets).length === 0) {
        note(
            `Create an API token from your Cloudflare Profile page: ${chalk.bold("https://dash.cloudflare.com/profile/api-tokens")}

Your token needs these permissions:

- Account Analytics: Read`,
        );
        try {
            const apiToken = await promptApiToken();
            if (apiToken) {
                const s = spinner();
                s.start(`Setting Cloudflare API token ...`);

                if (
                    await syncSecrets({
                        CF_ACCOUNT_ID: accountId,
                        CF_BEARER_TOKEN: apiToken,
                    })
                ) {
                    s.stop("Setting Cloudflare API token ... Done!");
                } else {
                    s.stop("Error setting Cloudflare API token", 1);
                    throw new Error("Error setting Cloudflare API token");
                }
            }
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    if (await promptDeploy(SERVER_PKG.version)) {
        s = spinner();
        s.start(`Deploying CounterScale ...`);

        const deployUrl = await deploy();

        s.stop("Deploying CounterScale ... Done.");

        if (deployUrl) {
            await tick(() =>
                note(
                    "NOTE: If this is your first time deploying to this subdomain, you may have to wait a few minutes before the site is live.",
                ),
            );

            await tick(() =>
                outro(
                    `⚡️ Visit your dashboard: ${chalk.rgb(...CLI_COLORS.tan).underline(deployUrl)}`,
                ),
            );

            await tick(() =>
                console.log(
                    "\nTo start capturing data, add the tracking script to your website: ",
                ),
            );
            await tick(() => {
                console.log(getScriptSnippet(deployUrl));
                console.log("\n\n" + chalk.dim("-- OR --") + "\n");
                console.log(getPackageSnippet(deployUrl, SERVER_PKG.version));
            });
        }
    }
}
