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

import shell from "shelljs"; // see https://stackoverflow.com/a/78649918

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
const makePathsAbsolute = (obj: Record<string, string>): void => {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
        if (
            typeof value === "string" &&
            value.includes("/") &&
            !path.isAbsolute(value)
        ) {
            obj[key] = path.join(SERVER_PKG_DIR, value);
        } else if (typeof value === "object") {
            makePathsAbsolute(value);
        }
    }
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

// async function promptDotDirectory() {
//     await inquirer
//         .prompt([
//             {
//                 type: "inquirer-fuzzy-path",
//                 name: "dotDirectory",
//                 message: "Where should ./counterscale go?",
//                 default: "~/",
//             },
//         ])
//         .then((answers) => {
//             if (answers.dotDirectory) {
//                 shell.mkdir(os.path.join(__dirname, "..", ".counterscale"));
//             }
//         });
// }

function createDotDirectory(): boolean {
    if (!shell.test("-d", COUNTERSCALE_DIR)) {
        shell.mkdir(COUNTERSCALE_DIR);
        return true;
    }
    return false;
}

function copyWranglerConfig(): void {
    // Copy wrangler.json to .counterscale directory
    shell.cp(
        path.join(SERVER_PKG_DIR, "wrangler.json"),
        path.join(COUNTERSCALE_DIR, "wrangler.json"),
    );
}

// Types for shell.exec callback
interface ShellExecCallback {
    (code: number, stdout: string, stderr: string): void;
}

async function fetchCloudflareSecrets(workerName: string): Promise<string> {
    const spinner = ora({
        text: `Fetching Cloudflare config for worker: ${workerName}`,
        hideCursor: false,
    });
    spinner.start();

    return new Promise<string>((resolve, reject) => {
        shell.exec(
            `npx wrangler secret list --config $HOME/.counterscale/wrangler.json`,
            {
                silent: true,
                async: true,
            },
            ((code: number, stdout: string, stderr: string) => {
                spinner.stop();
                if (code === 0) {
                    resolve(stdout);
                }
                reject(stdout || stderr);
            }) as ShellExecCallback,
        );
    });
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
        return shell.exit(1);
    }

    // parse wrangler secrets json output
    let secretsList: SecretItem[];
    try {
        secretsList = JSON.parse(rawSecrets);
    } catch (err) {
        console.error("Error: Unable to parse wrangler secrets");
        return shell.exit(1);
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
        return shell.exit(-1);
    }

    if (answers.cfApiToken) {
        shell.exec(
            `echo ${accountId} | npx wrangler secret put CF_ACCOUNT_ID --config $HOME/.counterscale/wrangler.json`,
            {},
        );
        shell.exec(
            `echo ${answers.cfApiToken} | npx wrangler secret put CF_BEARER_TOKEN --config $HOME/.counterscale/wrangler.json`,
            {},
        );
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

function deploy() {
    console.log("");

    let spinner: ReturnType<typeof ora> | undefined;
    if (!argv.verbose) {
        spinner = ora({
            text: `Deploying Counterscale ...`,
            hideCursor: false,
        });
        spinner.start();
    }

    shell.exec(
        `npx wrangler deploy --config $HOME/.counterscale/wrangler.json`,
        {
            silent: !argv.verbose,
            async: true,
        },
        (code, stdout, stderr) => {
            if (code !== 0) {
                spinner?.fail();
                console.log(stderr || stdout);
                return;
            }

            spinner?.stopAndPersist({
                symbol: chalk.rgb(...CLI_COLORS.teal)("✓"),
                text: chalk.rgb(...CLI_COLORS.teal)(
                    "Deploying Counterscale ... Done!",
                ),
            });

            // Extract the workers.dev domain
            const match = stdout.match(
                /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
            );

            if (match) {
                console.log("\nDeployed to:", "https://" + match[0]);
            } else {
                console.log(
                    "\nDeployed successfully but cannot determine deploy URL. Run again with --verbose.",
                );
            }
        },
    );
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

    return new Promise<string | null>((resolve, reject) => {
        shell.exec(`npx wrangler whoami`, { silent: true, async: true }, ((
            code: number,
            stdout: string,
            stderr: string,
        ) => {
            spinner.stop();
            if (code === 0) {
                const match = stdout.match(/([0-9a-f]{32})/);
                resolve(match ? match[0] : null);
            }
            reject(new Error(stderr || stdout));
        }) as ShellExecCallback);
    });
}

const TICK_LENGTH = 500;
async function tick(fn: () => void): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, TICK_LENGTH));
    fn();
}

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

    copyWranglerConfig();

    // Update wrangler.json with worker name and analytics dataset
    const wranglerConfig = JSON.parse(
        fs.readFileSync(wranglerConfigPath, "utf8"),
    );
    wranglerConfig.name = workerName;
    wranglerConfig.analytics_engine_datasets[0].dataset = analyticsDataset;
    makePathsAbsolute(wranglerConfig);
    fs.writeFileSync(
        wranglerConfigPath,
        JSON.stringify(wranglerConfig, null, 2),
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

    if (createDotDirectory()) {
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
