import sqlite3 from "sqlite3";
import { open } from "sqlite";
import inquirer from "inquirer";
import figlet from "figlet";
import shell from "shelljs";
import chalk from "chalk";
import ora from "ora";

import path from "node:path";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTERSCALE_DIR = path.join(homedir(), ".counterscale");

const silent = false;

const CLI_COLORS = {
    orange: [245, 107, 61],
    tan: [243, 227, 190],
};

console.log(
    chalk.rgb(...CLI_COLORS.orange)(
        figlet.textSync("Counterscale", {
            font: "slant",
        }),
    ),
);

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

function createDotDirectory() {
    if (!shell.test("-d", COUNTERSCALE_DIR)) {
        shell.mkdir(COUNTERSCALE_DIR);
        return true;
    }
    return false;
}

async function fetchCloudflareSecrets(workerName) {
    const spinner = ora({
        text: `Fetching Cloudflare config for ${workerName} ...`,
        hideCursor: false,
    });
    spinner.start();

    const child = shell.exec(
        `cd packages/server && npx wrangler secret list --name ${workerName}`,
        {
            silent: true,
            async: true,
        },
    );

    return new Promise((resolve, reject) => {
        child.stdout.on("data", function (data) {
            spinner.stop();
            resolve(data);
        });
        child.on("exit", function () {
            spinner.stop();
        });

        child.on("error", function (err) {
            spinner.stop();
            reject(err);
        });
    });
}

async function getCloudflareSecrets(workerName) {
    let rawSecrets;
    try {
        rawSecrets = await fetchCloudflareSecrets(workerName);
        // rawSecrets = "[]";
    } catch (err) {
        console.error("Wrangler failed:", err);
        shell.exit(1);
    }
    // const rawSecrets = await getCloudflareSecrets();

    // parse wrangler secrets json output
    let secretsList;
    console.log(secretsList);
    try {
        secretsList = JSON.parse(rawSecrets);
    } catch (err) {
        console.error("Error: Unable to parse wrangler secrets");
        shell.exit(1);
    }

    const secrets = {};
    Array.from(secretsList).forEach((secret) => {
        secrets[secret.name] = secret.type;
    });
    return secrets;
}

async function promptCloudFlareSecrets() {
    let answers;
    try {
        answers = await inquirer.prompt([
            /* Pass your questions in here */
            {
                type: "input",
                name: "cfAccountId",
                message: "What's your Cloudflare Account ID?",
                default: false,
            },
            /* Pass your questions in here */
            {
                type: "password",
                name: "cfApiToken",
                message: "What's your Cloudflare API Token?",
                default: false,
            },
        ]);
    } catch (err) {
        console.error(err);
    }

    if (answers.cfAccountId && answers.cfApiToken) {
        shell.env["CLOUDFLARE_API_TOKEN"] = answers.cfApiToken;
        shell.exec(
            `echo ${answers.cfAccountId} | npx wrangler secret put CF_ACCOUNT_ID`,
            { silent },
        );
        shell.exec(
            `echo ${answers.cfApiToken} | npx wrangler secret put CF_BEARER_TOKEN`,
            { silent },
        );
    }
}

async function promptDeploy() {
    inquirer
        .prompt([
            {
                type: "confirm",
                name: "deploy",
                message: "Do you want to deploy the site now?",
                default: false,
            },
        ])
        .then((answers) => {
            if (answers.deploy) {
                shell.exec("npx turbo run deploy", { silent });
            }
        });
}

async function initializeDb(db) {
    console.log("Building database ...");
    db.exec(`
    CREATE TABLE deployments(
        worker_name TEXT, 
        account_id TEXT,
        analytics_dataset TEXT,
        version TEXT,
        deployed_at DATETIME, 
        deploy_url TEXT
    );`);
}

async function promptNewProject() {
    return await inquirer.prompt([
        {
            type: "input",
            name: "workerName",
            message:
                "What do you want to name your worker? [default: counterscale]",
            default: "counterscale",
        },
        {
            type: "input",
            name: "analyticsDataset",
            message:
                "What do you want to name your analytics dataset? [default: counterscale-data]",
            default: "counterscale-data",
        },
    ]);
}

async function getAccountId() {
    const spinner = ora({
        text: "Fetching Cloudflare Account ID ...",
        hideCursor: false,
    });
    spinner.start();

    // regex account id from output of "npx wrangler whoami"
    const whoamiResult = await shell.exec("npx wrangler whoami", {
        silent: true,
    }).stdout;

    spinner.stop();

    const accountId = whoamiResult.match(/([0-9a-f]{32})/)[0];

    return accountId;
}

async function main() {
    if (createDotDirectory()) {
        console.log(
            chalk
                .rgb(...CLI_COLORS.tan)
                .bold("Created .counterscale directory in project root"),
        );
    }

    const db = await open({
        filename: path.join(COUNTERSCALE_DIR, "counterscale.db"),
        driver: sqlite3.Database,
    });

    const accountId = await getAccountId();
    console.log("Using Account ID:", accountId);
    // check if table exists
    const tableExists = await db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='deployments';`,
    );

    if (!tableExists) {
        await initializeDb(db);
    }

    const deploymentExists = await db.get(
        `SELECT count(*) as count FROM deployments ORDER BY deployed_at DESC LIMIT 1;`,
    );

    let workerName, analyticsDataset;
    if (!deploymentExists || deploymentExists.count === 0) {
        ({ workerName, analyticsDataset } = await promptNewProject());
        // insert answers into deployments table
        await db.run(
            `INSERT INTO deployments (account_id, worker_name, analytics_dataset) VALUES (?, ?, ?)`,
            [accountId, workerName, analyticsDataset],
        );
    } else {
        // select workerName from db
        ({ workerName, analyticsDataset } = await db.get(`
            SELECT 
                worker_name as workerName, 
                analytics_dataset as analyticsDataset 
            FROM deployments 
            ORDER BY deployed_at 
            DESC
            LIMIT 1;
        `));
    }

    const secrets = await getCloudflareSecrets(workerName);

    if (secrets.CF_ACCOUNT_ID && secrets.CF_BEARER_TOKEN) {
        console.log(
            chalk
                .rgb(...CLI_COLORS.tan)
                .bold("Cloudflare secrets already set!"),
        );
    } else {
        await promptCloudFlareSecrets();
    }

    await promptDeploy();
}

await main();
