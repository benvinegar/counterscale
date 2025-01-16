import inquirer from "inquirer";
import figlet from "figlet";
import shell from "shelljs";
import chalk from "chalk";
import ora from "ora";
import path from "node:path";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const silent = false;

console.log(
    chalk.rgb(
        245,
        107,
        61,
    )(
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
    if (!shell.test("-d", path.join(__dirname, "..", ".counterscale"))) {
        shell.mkdir(path.join(__dirname, "..", ".counterscale"));
        return true;
    }
    return false;
}

function fetchCloudflareSecrets() {
    const spinner = ora({
        text: "Fetching Cloudflare config ...",
        hideCursor: false,
    });
    spinner.start();

    const child = shell.exec("cd packages/server && npx wrangler secret list", {
        silent: true,
        async: true,
    });

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

async function getCloudflareSecrets() {
    let rawSecrets;
    try {
        rawSecrets = await fetchCloudflareSecrets();
        // rawSecrets = "[]";
    } catch (err) {
        console.error("Wrangler failed:", err);
        shell.exit(1);
    }
    // const rawSecrets = await getCloudflareSecrets();

    // parse wrangler secrets json output
    let secretsList;
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

if (createDotDirectory()) {
    console.log(
        chalk
            .rgb(243, 227, 190)
            .bold("Created .counterscale directory in project root"),
    );
}
const secrets = await getCloudflareSecrets();

if (secrets.CF_ACCOUNT_ID && secrets.CF_BEARER_TOKEN) {
    console.log(
        chalk.rgb(243, 227, 190).bold("Cloudflare secrets already set!"),
    );
} else {
    await promptCloudFlareSecrets();
}

await promptDeploy();
