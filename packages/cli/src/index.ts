#!/usr/bin/env node
import inquirer from "inquirer";
import figlet from "figlet";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
    .options({
        advanced: {
            type: "boolean",
            default: false,
        },
        verbose: {
            type: "boolean",
            default: false,
        },
    })
    .parseSync();

import { $, ProcessOutput } from "zx";

import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";

import { homedir } from "node:os";
import path from "node:path";

const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");
const COUNTERSCALE_HOMEPAGE = "https://counterscale.dev";

import { getServerPkgDir } from "./utils.js";
const SERVER_PKG_DIR = getServerPkgDir();

// Types for CLI colors
interface CliColors {
    orange: [number, number, number];
    tan: [number, number, number];
    teal: [number, number, number];
}

const CLI_COLORS: CliColors = {
    orange: [245, 107, 61],
    tan: [243, 227, 190],
    teal: [0, 205, 205],
};

// Recursively convert all relative paths to absolute
const makePathsAbsolute = (obj: Record<string, any>): Record<string, any> => {
    if (!obj || typeof obj !== "object") return obj;

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (
            typeof value === "string" &&
            value.includes("/") &&
            !path.isAbsolute(value)
        ) {
            result[key] = path.join(SERVER_PKG_DIR, value);
        } else if (Array.isArray(value)) {
            result[key] = value.map((v) => makePathsAbsolute(v));
        } else if (typeof value === "object") {
            result[key] = makePathsAbsolute(value);
        } else {
            result[key] = value;
        }
    }

    return result;
};

function printTitle(counterscaleVersion: string): void {
    console.log(
        chalk.rgb(...CLI_COLORS.orange)(
            figlet.textSync("Counterscale", {
                font: "Slant",
            }),
        ),
    );

    // output version number derived from package.json

    console.log(
        chalk.rgb(...CLI_COLORS.tan).underline(COUNTERSCALE_HOMEPAGE),
        "•",
        chalk.rgb(...CLI_COLORS.tan)(counterscaleVersion),
    );
    console.log("");
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

async function fetchCloudflareSecrets(workerName: string): Promise<string> {
    const spinner = ora({
        text: `Fetching Cloudflare config for worker: ${workerName}`,
        hideCursor: false,
    });
    spinner.start();

    try {
        const result =
            await $`npx wrangler secret list --config $HOME/.counterscale/wrangler.json`;
        spinner.stop();
        return result.stdout;
    } catch (error) {
        spinner.stop();
        throw error instanceof ProcessOutput
            ? error.stdout || error.stderr
            : error;
    }
}

interface SecretItem {
    name: string;
    type: string;
}

async function getCloudflareSecrets(
    workerName: string,
): Promise<Record<string, string>> {
    let rawSecrets: string;
    try {
        rawSecrets = await fetchCloudflareSecrets(workerName);
    } catch (err) {
        // worker not created yet
        if (typeof err === "string" && err.indexOf("[code: 10007]") !== -1) {
            return {};
        }
        // all other errors
        console.error(err);
        process.exit(1);
        return {};
    }

    // parse wrangler secrets json output
    let secretsList: SecretItem[];
    try {
        secretsList = JSON.parse(rawSecrets);
    } catch (err) {
        console.error("Error: Unable to parse wrangler secrets");
        process.exit(1);
        return {};
    }

    const secrets: Record<string, string> = {};
    secretsList.forEach((secret: SecretItem) => {
        secrets[secret.name] = secret.type;
    });
    return secrets;
}

async function promptCloudFlareSecrets(accountId: string): Promise<void> {
    interface CloudflareAnswers {
        cfApiToken: string;
    }

    console.log("");
    let answers: CloudflareAnswers;
    try {
        answers = await inquirer.prompt([
            {
                type: "password",
                mask: "*",
                name: "cfApiToken",
                message: "What's your Cloudflare API Token?",
                default: false,
            },
        ]);
    } catch (err) {
        console.error(err);
        process.exit(-1);
    }

    if (answers.cfApiToken) {
        await $`echo ${accountId} | npx wrangler secret put CF_ACCOUNT_ID --config $HOME/.counterscale/wrangler.json`;
        await $`echo ${answers.cfApiToken} | npx wrangler secret put CF_BEARER_TOKEN --config $HOME/.counterscale/wrangler.json`;
        console.log("");
    }
}

async function promptDeploy(counterscaleVersion: string): Promise<void> {
    interface DeployAnswers {
        deploy: boolean;
    }

    inquirer
        .prompt<DeployAnswers>([
            {
                type: "confirm",
                name: "deploy",
                message: `Do you want to deploy version ${counterscaleVersion} now?`,
                default: false,
            },
        ])
        .then((answers) => {
            if (answers.deploy) {
                deploy();
            }
        });
}

async function deploy() {
    console.log("");

    let spinner: ReturnType<typeof ora> | undefined;
    if (!argv.verbose) {
        spinner = ora({
            text: `Deploying Counterscale ...`,
            hideCursor: false,
        });
        spinner.start();
    }

    try {
        const result =
            await $`npx wrangler deploy --config $HOME/.counterscale/wrangler.json`;

        if (!argv.verbose) {
            spinner?.stopAndPersist({
                symbol: chalk.rgb(...CLI_COLORS.teal)("✓"),
                text: chalk.rgb(...CLI_COLORS.teal)(
                    "Deploying Counterscale ... Done!",
                ),
            });
        } else {
            console.log(result.stdout);
        }

        // Extract the workers.dev domain
        const match = result.stdout.match(
            /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
        );

        if (match) {
            console.log("\nDeployed to:", "https://" + match[0]);
        } else {
            console.log(
                "\nDeployed successfully but cannot determine deploy URL. Run again with --verbose.",
            );
        }
    } catch (error) {
        spinner?.fail();
        if (error instanceof ProcessOutput) {
            console.log(error.stderr || error.stdout);
        } else {
            console.error(error);
        }
    }
}

interface NewProjectAnswers {
    workerName: string;
    analyticsDataset: string;
}

async function promptProjectConfig(
    defaultWorkerName?: string,
    defaultAnalyticsDataset?: string,
): Promise<NewProjectAnswers> {
    console.log("");
    return await inquirer.prompt<NewProjectAnswers>([
        {
            type: "input",
            name: "workerName",
            message: `What do you want to name your worker? [default: ${defaultWorkerName}]`,
            default: defaultWorkerName,
        },
        {
            type: "input",
            name: "analyticsDataset",
            message: `What do you want to name your analytics dataset? [default: ${defaultAnalyticsDataset}]`,
            default: defaultAnalyticsDataset,
        },
    ]);
}

async function getAccountId(): Promise<string | null> {
    const spinner = ora({
        text: "Fetching Cloudflare Account ID ...",
        hideCursor: false,
    });
    spinner.start();

    try {
        const result = await $({ quiet: true })`npx wrangler whoami`;
        spinner.stop();
        return result.stdout;
    } catch (error) {
        spinner.stop();
        if (error instanceof ProcessOutput) {
            throw new Error(error.stderr || error.stdout);
        } else {
            throw error;
        }
    }
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
async function prepareDeployConfig(): Promise<{
    workerName: string;
    analyticsDataset: string;
}> {
    let workerName, analyticsDataset;
    // check if wrangler.json in .counterscale dir
    const wranglerConfigPath = path.join(COUNTERSCALE_DIR, "wrangler.json");

    const distConfig = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "wrangler.json"), "utf8"),
    );

    const defaultWorkerName = distConfig.name;
    const defaultAnalyticsDataset =
        distConfig.analytics_engine_datasets[0].dataset;

    if (argv.advanced) {
        ({ workerName, analyticsDataset } = await promptProjectConfig(
            defaultWorkerName,
            defaultAnalyticsDataset,
        ));
    } else {
        workerName = distConfig.name;
        analyticsDataset = distConfig.analytics_engine_datasets[0].dataset;
    }

    await tick(() =>
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using worker:"),
            workerName,
        ),
    );
    await tick(() =>
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using analytics dataset:"),
            analyticsDataset,
        ),
    );

    // Update wrangler.json with worker name and analytics dataset
    const wranglerConfig = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "wrangler.json"), "utf8"),
    );
    wranglerConfig.name = workerName;
    wranglerConfig.analytics_engine_datasets[0].dataset = analyticsDataset;

    const updatedConfig = makePathsAbsolute(wranglerConfig);

    fs.writeFileSync(
        wranglerConfigPath,
        JSON.stringify(updatedConfig, null, 2),
    );

    return new Promise((resolve) => resolve({ workerName, analyticsDataset }));
}

async function main(): Promise<void> {
    const pkg = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "package.json"), "utf8"),
    );
    printTitle(pkg.version);

    const accountId = await getAccountId();
    if (!accountId) {
        console.log("Not authenticated with Cloudflare.\n");
        console.log(
            `Run ${chalk.red(`npx wrangler login`)} first, then try again.`,
        );
        process.exit(1);
    }
    console.log(
        chalk.rgb(...CLI_COLORS.teal)(
            "✓ Authenticated with Cloudflare using Account ID ending in:",
        ),
        accountId.slice(-6), // show only last 6 digits for privacy
        "\n",
    );

    await tick(() => {
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using server package found in:"),
            SERVER_PKG_DIR,
        );
    });

    if (await createDotDirectory()) {
        await tick(() => {
            console.log(
                chalk.rgb(...CLI_COLORS.teal)("✓ Created .counterscale in:"),
                COUNTERSCALE_DIR,
            );
        });
    } else {
        await tick(() => {
            console.log(
                chalk.rgb(...CLI_COLORS.teal)(
                    "✓ Using .counterscale found in:",
                ),
                COUNTERSCALE_DIR,
            );
        });
    }

    const { workerName } = await prepareDeployConfig();

    console.log("");
    const secrets = await getCloudflareSecrets(workerName);
    if (Object.keys(secrets).length > 0) {
        console.log(
            chalk.rgb(...CLI_COLORS.teal)(
                "✓ Cloudflare secrets are already set.",
            ),
        );
    } else {
        await promptCloudFlareSecrets(accountId);
    }

    console.log("");
    await promptDeploy(pkg.version);
}

await main();
