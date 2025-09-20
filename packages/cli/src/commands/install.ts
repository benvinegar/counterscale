import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
    intro,
    password,
    text,
    log,
    confirm,
    spinner,
    note,
    isCancel,
    cancel,
    outro,
    select,
} from "@clack/prompts";

import chalk from "chalk";
import type { ArgumentsCamelCase } from "yargs";

import {
    stageDeployConfig,
    readInitialServerConfig,
    getWorkerAndDatasetName,
} from "../lib/config.js";

import {
    CloudflareClient,
    validateCloudflareToken,
} from "../lib/cloudflare.js";
import {
    getScriptSnippet,
    getPackageSnippet,
    CLI_COLORS,
    promptForPassword,
} from "../lib/ui.js";
import { generateJWTSecret, generatePasswordHash } from "../lib/auth.js";

export function bail() {
    cancel("Operation canceled.");
    if (process.env.NODE_ENV === "test") {
        throw new Error("Operation canceled");
    }
    process.exit(0);
}

export async function promptApiToken(): Promise<string> {
    const cfApiToken = await password({
        message: "Enter your Cloudflare API Token",
        mask: "*",
        validate: (value) => {
            if (typeof value !== "string" || value.length === 0) {
                return "API token is required";
            }

            if (value.length < 40) {
                return "Token appears to be too short";
            }

            return undefined;
        },
    });

    if (isCancel(cfApiToken)) {
        bail();
    }

    if (typeof cfApiToken !== "string" || cfApiToken.length === 0) {
        throw new Error("API token is required");
    }

    const s = spinner();
    s.start("Validating token...");

    try {
        const result = await validateCloudflareToken(cfApiToken);
        s.stop("Token Validated");

        if (!result.valid) {
            throw new Error(
                result.error ||
                    "Invalid token or insufficient permissions. Please verify your token has 'Account Analytics: Read' permission.",
            );
        }
    } catch (error) {
        s.stop();
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(
            "Failed to validate token. Please check your internet connection.",
        );
    }

    return cfApiToken;
}

export async function promptPasswordProtection(): Promise<boolean> {
    const enableAuth = await confirm({
        message: "Do you want to protect your dashboard with a password?",
        initialValue: true,
    });

    return enableAuth === true;
}

export async function promptDeploy(
    counterscaleVersion: string,
): Promise<boolean> {
    const deploy = await confirm({
        message: `Do you want to deploy version ${counterscaleVersion} now?`,
        initialValue: false,
    });

    return deploy === true;
}

export interface NewProjectAnswers {
    workerName: string;
    analyticsDataset: string;
}

export interface AccountInfo {
    id: string;
    name: string;
}

export async function promptAccountSelection(
    accounts: AccountInfo[],
): Promise<string> {
    const selectedAccount = await select({
        message: "Select a Cloudflare account:",
        options: accounts.map((account) => ({
            value: account.id,
            label: `${account.name} (${account.id.slice(-6)})`,
        })),
    });

    if (isCancel(selectedAccount)) {
        bail();
    }

    return selectedAccount as string;
}

export async function promptProjectConfig(
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
 * Main CLI install script, takes various user input (e.g. target worker name, Cloudflare API key, etc.)
 * and installs the CounterScale worker on Cloudflare.
 *
 * @param argv yargs-processed arguments
 * @param serverPkgDir Directory containing the server package
 * @param serverPkgJson Server package.json contents
 */
export async function install(
    argv: ArgumentsCamelCase,
    serverPkgDir: string,
    serverPkgJson: ReturnType<typeof JSON.parse>,
): Promise<void> {
    intro("install");

    // convert argv to opts (Record)
    const opts = argv as Record<string, boolean | unknown>;

    // Create a temporary directory for our config
    const tmpStagingDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "counterscale-"),
    );
    const tmpStagingConfigPath = path.join(tmpStagingDir, "wrangler.json");

    // Ensure we clean up the temporary directory when we're done
    const cleanup = () => {
        try {
            fs.rmSync(tmpStagingDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    const cloudflare = new CloudflareClient(tmpStagingConfigPath);

    const s = spinner();
    s.start("Fetching Cloudflare accounts ...");
    const accounts = await cloudflare.getAccounts();

    if (accounts.length === 0) {
        s.stop("Not authenticated with Cloudflare.\n");
        log.info(
            `Run ${chalk.red(`npx wrangler login`)} first, then try again.`,
        );
        process.exit(1);
    }

    let accountId: string;

    if (accounts.length === 1) {
        accountId = accounts[0].id;
        s.stop(
            "Authenticated with Cloudflare using Account ID ending in: " +
                chalk.rgb(...CLI_COLORS.teal)(accountId.slice(-6)),
        );
    } else {
        s.stop(`Found ${accounts.length} Cloudflare accounts.`);
        accountId = await promptAccountSelection(accounts);
        log.info(
            "Selected account: " +
                chalk.rgb(...CLI_COLORS.teal)(accountId.slice(-6)),
        );
    }

    if (argv.verbose) {
        await tick(() => {
            log.info(
                "Using server package found in: " +
                    chalk.rgb(...CLI_COLORS.teal)(serverPkgDir),
            );
        });
    }

    if (argv.verbose) {
        await tick(() => {
            log.info(
                "Using staging config in: " +
                    chalk.rgb(...CLI_COLORS.teal)(tmpStagingConfigPath),
            );
        });
    }

    const initialDeployConfig = readInitialServerConfig();

    let { workerName, analyticsDataset } =
        getWorkerAndDatasetName(initialDeployConfig);

    // If --advanced is true, prompt the user for worker name and analytics dataset name.
    // Otherwise, stick to the default values read from the server package.
    if (opts.advanced) {
        ({ workerName, analyticsDataset } = await promptProjectConfig(
            workerName,
            analyticsDataset,
        ));
    }

    if (opts.verbose) {
        await tick(() => {
            log.info(
                "Using worker name: " +
                    chalk.rgb(...CLI_COLORS.teal)(workerName),
            );
        });
        await tick(() => {
            log.info(
                "Using analytics dataset: " +
                    chalk.rgb(...CLI_COLORS.teal)(analyticsDataset),
            );
        });
    }

    await stageDeployConfig(
        tmpStagingConfigPath,
        initialDeployConfig,
        workerName,
        analyticsDataset,
        accountId,
    );

    const secrets = await cloudflare.getCloudflareSecrets();

    try {
        // Check if CF_BEARER_TOKEN is missing
        if (!secrets?.CF_BEARER_TOKEN) {
            note(
                `Create an API token from your Cloudflare Profile page: ${chalk.bold(
                    "https://dash.cloudflare.com/profile/api-tokens",
                )}

Your token needs these permissions:

- Account Analytics: Read`,
            );
            const apiToken = await promptApiToken();
            if (apiToken) {
                const s = spinner();
                s.start(`Setting Cloudflare API token ...`);

                if (
                    await cloudflare.setCloudflareSecrets({
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
        }

        if (!secrets?.CF_AUTH_ENABLED || !secrets?.CF_PASSWORD_HASH || !secrets?.CF_JWT_SECRET) {
            const enableAuth = await promptPasswordProtection();
            
            const s = spinner();
            s.start(`Setting CounterScale Authentication Settings ...`);
            
            if (enableAuth) {
                // If auth is enabled, prompt for password and set all required secrets
                const appPassword = await promptForPassword("Enter the password you will use to access the Counterscale Dashboard");
                if (appPassword) {
                    const jwtSecret = generateJWTSecret();
                    const passwordHash = await generatePasswordHash(appPassword);

                    if (
                        await cloudflare.setCloudflareSecrets({
                            CF_AUTH_ENABLED: "true",
                            CF_PASSWORD_HASH: passwordHash,
                            CF_JWT_SECRET: jwtSecret,
                        })
                    ) {
                        s.stop(
                            "Setting CounterScale Authentication Settings ... Done!",
                        );
                    } else {
                        s.stop(
                            "Error setting CounterScale Authentication Settings",
                            1,
                        );
                        throw new Error(
                            "Error setting CounterScale Authentication Settings",
                        );
                    }
                }
            } else {
                // If auth is disabled, just set CF_AUTH_ENABLED to false
                if (
                    await cloudflare.setCloudflareSecrets({
                        CF_AUTH_ENABLED: "false",
                    })
                ) {
                    s.stop(
                        "Setting CounterScale Authentication Settings ... Done!",
                    );
                } else {
                    s.stop(
                        "Error setting CounterScale Authentication Settings",
                        1,
                    );
                    throw new Error(
                        "Error setting CounterScale Authentication Settings",
                    );
                }
            }
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }

    if (await promptDeploy(serverPkgJson.version)) {
        let deployUrl;

        const s = spinner();
        s.start(`Deploying Counterscale ...`);

        try {
            if (opts.verbose) {
                s.stop(`Deploying Counterscale ...`);
            }

            deployUrl = await cloudflare.deploy(
                opts.verbose ? true : false,
                serverPkgJson.version,
            );

            if (!opts.verbose) {
                s.stop("Deploying Counterscale ... Done.");
            }
        } catch (err) {
            s.stop("Deploying Counterscale ... Failed!", 1);
            throw err;
        }

        if (deployUrl) {
            await tick(() =>
                note(
                    "NOTE: If this is your first time deploying to this subdomain, you may have to wait a few minutes before the site is live.",
                ),
            );

            await tick(() =>
                outro(
                    `⚡️ Visit your dashboard: ${chalk
                        .rgb(...CLI_COLORS.tan)
                        .underline(deployUrl)}`,
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
                console.log(
                    getPackageSnippet(deployUrl, serverPkgJson.version),
                );
            });
        }
    }
}
