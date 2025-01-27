#!/usr/bin/env node
import inquirer from "inquirer";
import figlet from "figlet";

// @ts-expect-error 7016
import shell from "shelljs"; // see https://stackoverflow.com/a/78649918

import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";

import path from "node:path";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");
const COUNTERSCALE_HOMEPAGE = "https://counterscale.dev";

function getServerPkgDir(): string {
    const npmRoot = shell.exec("npm root", {
        silent: true,
    }).stdout;

    // find the @counterscale/server package
    // 1) first check local node_modules dir
    const nodeModulePath = path.join(npmRoot.trim(), "@counterscale", "server");
    if (fs.existsSync(nodeModulePath)) {
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
    if (fs.existsSync(monoRepoPath)) {
        return monoRepoPath;
    }

    throw new Error(
        "Could not find @counterscale/server package. Is it installed?",
    );
}

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
const makePathsAbsolute = (obj: Record<string, any>): void => {
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

function printTitle(): void {
    console.log(
        chalk.rgb(...CLI_COLORS.orange)(
            figlet.textSync("Counterscale", {
                font: "Slant",
            }),
        ),
    );

    // output version number derived from package.json
    const pkg = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "package.json"), "utf8"),
    );
    console.log(
        chalk.rgb(...CLI_COLORS.tan).underline(COUNTERSCALE_HOMEPAGE),
        "•",
        chalk.rgb(...CLI_COLORS.tan)(pkg.version),
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
                // NOTE: wrangler sends error text to stdout, not stderr
                reject(stdout);
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

async function promptDeploy(): Promise<void> {
    interface DeployAnswers {
        deploy: boolean;
    }

    inquirer
        .prompt<DeployAnswers>([
            {
                type: "confirm",
                name: "deploy",
                message: "Do you want to deploy the site now?",
                default: false,
            },
        ])
        .then((answers) => {
            if (answers.deploy) {
                shell.exec(
                    `npx wrangler deploy --config $HOME/.counterscale/wrangler.json`,
                    {
                        silent: false,
                    },
                );
            }
        });
}

interface NewProjectAnswers {
    workerName: string;
    analyticsDataset: string;
}

async function promptNewProject(
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

interface AccountIdResponse {
    result: {
        id: string;
    };
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

async function prepareDeployConfig(): Promise<{
    workerName: string;
    analyticsDataset: string;
}> {
    let workerName, analyticsDataset;
    // check if wrangler.json in .counterscale dir
    const wranglerConfigPath = path.join(COUNTERSCALE_DIR, "wrangler.json");
    if (!fs.existsSync(wranglerConfigPath)) {
        const distConfig = JSON.parse(
            fs.readFileSync(path.join(SERVER_PKG_DIR, "wrangler.json"), "utf8"),
        );

        const defaultWorkerName = distConfig.name;
        const defaultAnalyticsDataset =
            distConfig.analytics_engine_datasets[0].dataset;

        ({ workerName, analyticsDataset } = await promptNewProject(
            defaultWorkerName,
            defaultAnalyticsDataset,
        ));
        console.log("");

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
    } else {
        const wranglerConfig = JSON.parse(
            fs.readFileSync(wranglerConfigPath, "utf8"),
        );
        workerName = wranglerConfig.name;
        analyticsDataset = wranglerConfig.analytics_engine_datasets[0].dataset;

        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using worker:"),
            workerName,
        );
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using analytics dataset:"),
            analyticsDataset,
        );

        // rewrite paths just-in-case we're re-using an earlier ~/.counterscale/wrangler.json
        makePathsAbsolute(wranglerConfig);
        fs.writeFileSync(
            wranglerConfigPath,
            JSON.stringify(wranglerConfig, null, 2),
        );
    }

    return new Promise((resolve) => resolve({ workerName, analyticsDataset }));
}

async function main(): Promise<void> {
    printTitle();

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

    console.log(
        chalk.rgb(...CLI_COLORS.teal)("✓ Using server package found in:"),
        SERVER_PKG_DIR,
    );

    if (createDotDirectory()) {
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Created .counterscale in:"),
            COUNTERSCALE_DIR,
        );
    } else {
        console.log(
            chalk.rgb(...CLI_COLORS.teal)("✓ Using .counterscale found in:"),
            COUNTERSCALE_DIR,
        );
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
    await promptDeploy();
}

await main();
