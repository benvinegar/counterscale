#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import inquirer from "inquirer";
import figlet from "figlet";
import chalk from "chalk";
import ora from "ora";
import { highlight } from "cli-highlight";

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

const highlightTheme = {
    class: chalk.rgb(...CLI_COLORS.teal),
    literal: chalk.rgb(...CLI_COLORS.teal),
    keyword: chalk.rgb(...CLI_COLORS.orange),
    built_in: chalk.rgb(...CLI_COLORS.orange),
    name: chalk.rgb(...CLI_COLORS.orange),
    string: chalk.rgb(...CLI_COLORS.tan),
    default: chalk.white,
    plain: chalk.white,
};

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

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

async function promptApiToken(): Promise<string> {
    const { cfApiToken } = await inquirer.prompt([
        {
            type: "password",
            mask: "*",
            name: "cfApiToken",
            message: "What's your Cloudflare API Token?",
            default: false,
        },
    ]);
    return cfApiToken;
}

async function promptDeploy(counterscaleVersion: string): Promise<boolean> {
    const { deploy } = await inquirer.prompt([
        {
            type: "confirm",
            name: "deploy",
            message: `Do you want to deploy version ${counterscaleVersion} now?`,
            default: false,
        },
    ]);
    return deploy;
}

async function deploy(): Promise<string | undefined> {
    console.log("");

    let spinner: ReturnType<typeof ora> | undefined;
    if (!argv.verbose) {
        spinner = ora({
            text: `Deploying Counterscale ...`,
            hideCursor: false,
        });
        spinner.start();
    }

    let result: ProcessOutput | undefined;
    try {
        result =
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
    } catch (error) {
        spinner?.fail();
        if (error instanceof ProcessOutput) {
            console.log(error.stderr || error.stdout);
        } else {
            console.error(error);
        }
    }

    // Extract the workers.dev domain
    const match = result?.stdout.match(
        /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
    );
    const deployUrl = match ? "https://" + match[0] : undefined;

    if (!deployUrl) {
        console.log(
            "\nDeployed successfully but cannot determine deploy URL. Run again with --verbose.",
        );
        return;
    }

    return new Promise((resolve) => resolve(deployUrl));
}

function emitInstallReadme(deployUrl: string, counterscaleVersion: string) {
    console.log("");
    console.log("To add the tracking script to your web app:");
    console.log(
        highlight(
            `
    <script
        id="counterscale-script"
        data-site-id="YOUR_UNIQUE_SITE_ID__CHANGE_THIS"
        src="${deployUrl}/tracker.js"
        defer
    ></script>`,
            { language: "html", theme: highlightTheme },
        ),
    );

    console.log("");
    console.log("- OR -");
    console.log(
        highlight(
            `
  // $ npm install @counterscale/tracker@${counterscaleVersion}

  import * as Counterscale from "@counterscale/tracker";

  Counterscale.init({
      siteId: "YOUR_UNIQUE_SITE_ID__CHANGE_THIS",
      reporterUrl: "${deployUrl}/collect",
  });
    `,
            { language: "typescript", theme: highlightTheme },
        ),
    );

    const visitYourDashboardPrefix = "👉 Visit your dashboard: ";
    const visitYourDashboardRaw = visitYourDashboardPrefix + " " + deployUrl;
    const maxCharLength = visitYourDashboardRaw.length;
    console.log("=".repeat(maxCharLength));
    console.log(visitYourDashboardPrefix, chalk.white.bold(deployUrl));

    const availabilityNote =
        "NOTE: If this is your first time deploying to this subdomain, you may have to wait a few minutes before the site is live.";

    // Break text into chunks that fit within maxCharLength because we're fancy like that
    const words = availabilityNote.split(" ");
    let currentLine = "";
    const lines = [];

    for (const word of words) {
        if ((currentLine + " " + word).length <= maxCharLength) {
            currentLine = currentLine ? currentLine + " " + word : word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);

    console.log("");
    lines.forEach((line) => console.log(chalk.dim(line)));
    console.log("=".repeat(maxCharLength));
}

interface NewProjectAnswers {
    workerName: string;
    analyticsDataset: string;
}

async function promptProjectConfig(
    defaultWorkerName?: string,
    defaultAnalyticsDataset?: string,
): Promise<NewProjectAnswers> {
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

        const match = result.stdout.match(/([0-9a-f]{32})/);
        return match ? match[0] : null;
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
        console.log("");
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

    return { workerName, analyticsDataset };
}

async function syncSecrets(secrets: Record<string, string>): Promise<boolean> {
    for (const [key, value] of Object.entries(secrets)) {
        try {
            await $`echo ${value} | npx wrangler secret put ${key} --config $HOME/.counterscale/wrangler.json`;
        } catch (err) {
            return false;
        }
    }
    return true;
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
        try {
            const apiToken = await promptApiToken();
            if (apiToken) {
                const spinner = ora({
                    text: `Setting Cloudflare secrets ...`,
                    hideCursor: false,
                });
                spinner.start();

                if (
                    await syncSecrets({
                        CF_ACCOUNT_ID: accountId,
                        CF_BEARER_TOKEN: apiToken,
                    })
                ) {
                    spinner.stopAndPersist({
                        symbol: chalk.rgb(...CLI_COLORS.teal)("✓"),
                        text: chalk.rgb(...CLI_COLORS.teal)(
                            "Setting Cloudflare secrets ... Done!",
                        ),
                    });
                } else {
                    spinner.stop();
                    throw new Error("Error setting Cloudflare Secrets");
                }
            }
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    console.log("");
    if (await promptDeploy(pkg.version)) {
        const deployUrl = await deploy();

        if (deployUrl) {
            emitInstallReadme(deployUrl, pkg.version);
        }
    }
}

await main();
