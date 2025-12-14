#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { getTitle } from "./lib/ui.js";
import { getServerPkgDir } from "./lib/config.js";
import { install } from "./commands/install.js";
import { enableAuth, disableAuth, updatePassword } from "./commands/auth.js";
import { enableStorage, disableStorage } from "./commands/storage.js";
import { envCommand, SECRETS_BY_ALIAS } from "./commands/env.js";

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

const COUNTERSCALE_HOMEPAGE = "https://counterscale.dev";
const SERVER_PKG_DIR = getServerPkgDir();

let SERVER_PKG: ReturnType<typeof JSON.parse>;
try {
    SERVER_PKG = JSON.parse(
        fs.readFileSync(path.join(SERVER_PKG_DIR, "package.json"), "utf8"),
    );
} catch {
    console.error("Error: Unable to parse server package.json");
    process.exit(1);
}

console.log(getTitle(SERVER_PKG.version, COUNTERSCALE_HOMEPAGE) + "\n");

const parser = yargs(hideBin(process.argv))
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
            await install(argv, SERVER_PKG_DIR, SERVER_PKG);
        },
    )
    .command(
        "auth",
        "Manage authentication settings",
        (yargs) => {
            const authYargs = yargs
                .command(
                    "enable",
                    "Enable authentication for your Counterscale deployment",
                    {},
                    enableAuth
                )
                .command(
                    "disable",
                    "Disable authentication for your Counterscale deployment",
                    {},
                    disableAuth
                )
                .command(
                    "role",
                    "Update the authentication password",
                    {},
                    updatePassword
                )
                .help();
            return authYargs;
        },
        async (argv) => {
            // Show help if no subcommand was provided
            if (argv._.length === 1) {
                const authYargs = yargs(hideBin(process.argv))
                    .command(
                        "enable",
                        "Enable authentication for your Counterscale deployment",
                        {},
                        enableAuth
                    )
                    .command(
                        "disable",
                        "Disable authentication for your Counterscale deployment",
                        {},
                        disableAuth
                    )
                    .command(
                        "role",
                        "Update the authentication password",
                        {},
                        updatePassword
                    )
                    .help();
                authYargs.showHelp();
            }
        },
    )
    .command(
        "storage",
        "Manage long term storage settings",
        (yargs) => {
            const storageYargs = yargs
                .command(
                    "enable",
                    "Enable long term data storage for your Counterscale data",
                    {},
                    enableStorage,
                )
                .command(
                    "disable",
                    "Disable long term data storage for your Counterscale data",
                    {},
                    disableStorage,
                )
                .help();
            return storageYargs;
        },
        async (argv) => {
            // Show help if no subcommand was provided
            if (argv._.length === 1) {
                const storageYargs = yargs(hideBin(process.argv))
                    .command(
                        "enable",
                        "Enable storage for your Counterscale deployment",
                        {},
                        enableStorage,
                    )
                    .command(
                        "disable",
                        "Disable storage for your Counterscale deployment",
                        {},
                        disableStorage,
                    )
                    .help();
                storageYargs.showHelp();
            }
        },
    )
    .command(
        "env [secret]",
        "Update environment secrets",
        (yargs) => {
            const supportedSecrets = Array.from(SECRETS_BY_ALIAS.keys()).join(
                ", ",
            );
            yargs.positional("secret", {
                describe: `The secret to update. Supported: ${supportedSecrets}`,
                type: "string",
            });
        },
        async (argv) => {
            await envCommand(argv.secret as string | undefined);
        },
    )
    .options({
        verbose: {
            type: "boolean",
            default: false,
        },
    })
    .help()
    .fail(false);

try {
    const argv = await parser.parse();
    if (argv._.length === 0) {
        parser.showHelp();
    }
} catch (err) {
    console.log("\n");
    console.error(err);
    process.exit(1);
}
