#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import {
    intro,
    outro,
    log,
    password,
    text,
    confirm,
    spinner,
    note,
    isCancel,
    cancel,
} from "@clack/prompts";
import figlet from "figlet";
import chalk from "chalk";
import { highlight } from "cli-highlight";

const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");
const COUNTERSCALE_HOMEPAGE = "https://counterscale.dev";

import { getServerPkgDir } from "./utils.js";

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

const CLI_COLORS: Record<string, [number, number, number]> = {
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

console.log(getTitle() + "\n");

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

import { $, ProcessOutput } from "zx";
import { ArgumentsCamelCase } from "yargs";

function bail() {
    cancel("Operation canceled.");
    process.exit(0);
}

// Recursively convert all relative paths to absolute
const makePathsAbsolute = (
    obj: ReturnType<typeof JSON.parse>,
): ReturnType<typeof JSON.parse> => {
    if (!obj || typeof obj !== "object") return obj;

    const result: ReturnType<typeof JSON.parse> = {};

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

function getTitle(): string {
    const counterscaleVersion = SERVER_PKG.version;
    const title = chalk.rgb(...CLI_COLORS.orange)(
        figlet.textSync("Counterscale", {
            font: "Slant",
        }),
    );

    const subtitle = [
        chalk.rgb(...CLI_COLORS.tan).underline(COUNTERSCALE_HOMEPAGE),
        "•",
        chalk.rgb(...CLI_COLORS.tan)(counterscaleVersion),
    ].join(" ");

    return `${title}\n${subtitle}`;
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

async function fetchCloudflareSecrets(): Promise<string> {
    try {
        const result =
            await $`npx wrangler secret list --config $HOME/.counterscale/wrangler.json`;
        return result.stdout;
    } catch (error) {
        throw error instanceof ProcessOutput
            ? error.stdout || error.stderr
            : error;
    }
}

interface SecretItem {
    name: string;
    type: string;
}

async function getCloudflareSecrets(): Promise<Record<string, string>> {
    let rawSecrets: string;
    try {
        rawSecrets = await fetchCloudflareSecrets();
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

async function deploy(): Promise<string | undefined> {
    const s = spinner();
    s.start(`Deploying Counterscale ...`);

    let result: ProcessOutput | undefined;
    try {
        result =
            await $`npx wrangler deploy --config $HOME/.counterscale/wrangler.json`;
    } catch (error) {
        s?.stop(chalk.red("Deploy failed"));

        if (error instanceof ProcessOutput) {
            console.log(error.stderr || error.stdout);
        } else {
            console.error(error);
        }
        process.exit(-1);
    }

    // Extract the workers.dev domain
    const match = result?.stdout.match(
        /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
    );
    const deployUrl = match ? "https://" + match[0] : "<unknown>";

    s?.stop("Deploying Counterscale ... Done.");

    return new Promise((resolve) => resolve(deployUrl));
}

function getScriptSnippet(deployUrl: string) {
    return highlight(
        `
<script
    id="counterscale-script"
    data-site-id="YOUR_UNIQUE_SITE_ID__CHANGE_THIS"
    src="${deployUrl}/tracker.js"
    defer
></script>`,
        { language: "html", theme: highlightTheme },
    );
}

function getPackageSnippet(deployUrl: string, counterscaleVersion: string) {
    return highlight(
        `
// $ npm install @counterscale/tracker@${counterscaleVersion}

import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "YOUR_UNIQUE_SITE_ID__CHANGE_THIS",
    reporterUrl: "${deployUrl}/collect",
});`,
        { language: "typescript", theme: highlightTheme },
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

async function getAccountId(): Promise<string | null> {
    try {
        const result = await $({ quiet: true })`npx wrangler whoami`;
        const match = result.stdout.match(/([0-9a-f]{32})/);
        return match ? match[0] : null;
    } catch (error) {
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

function info(...str: string[]): void {
    log.info(str.join(" "));
}
async function install(argv: ArgumentsCamelCase): Promise<void> {
    intro("install");
    // convert argv to opts (Record)
    const opts = argv as Record<string, boolean | unknown>;

    const s = spinner();
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
        const deployUrl = await deploy();

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
