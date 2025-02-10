#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { getTitle } from "./ui.js";
import { getServerPkgDir } from "./config.js";
import { install } from "./install.js";

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

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
            await install(argv, SERVER_PKG_DIR, SERVER_PKG);
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
