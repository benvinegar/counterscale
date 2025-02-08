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

async function fetchCloudflareSecrets(workerName: string): Promise<string> {
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
    const cfApiToken = await password({
        message: "What's your Cloudflare API Token?",
        mask: "*",
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

async function deploy(
    opts: Record<string, boolean | unknown>,
): Promise<string | undefined> {
    let s;
    if (!opts.verbose) {
        s = spinner();
        s.start(`Deploying Counterscale ...`);
    }

    let result: ProcessOutput | undefined;
    try {
        result =
            await $`npx wrangler deploy --config $HOME/.counterscale/wrangler.json`;

        if (!opts.verbose) {
            s?.stop(
                chalk.rgb(...CLI_COLORS.teal)(
                    "Deploying Counterscale ... Done!",
                ),
            );
        } else {
            console.log(result.stdout);
        }
    } catch (error) {
        if (!opts.verbose) {
            s?.stop(chalk.red("Deploy failed"));
        }
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
    const visitYourDashboardRaw = visitYourDashboardPrefix + deployUrl;
    const maxCharLength = visitYourDashboardRaw.length + 1; // +1 for emoji character

    // make the ========= border match the length of the string (looks a little cleaner)
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

    const { workerName } = await prepareDeployConfig(opts);

    s = spinner();
    s.start(`Verifying Cloudflare API token is configured ...`);

    const secrets = await getCloudflareSecrets(workerName);

    if (Object.keys(secrets).length > 0) {
        s.stop(`Cloudflare API token is configured.`);
    } else {
        s.stop(`Cloudflare API token not configured.`, 1);
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
        const deployUrl = await deploy(opts);

        if (deployUrl) {
            emitInstallReadme(deployUrl, SERVER_PKG.version);
        }
    }
}
