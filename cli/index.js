import inquirer from "inquirer";
import figlet from "figlet";
import shell from "shelljs";

console.log(
    figlet.textSync("Counterscale", {
        font: "slant",
    }),
);

inquirer
    .prompt([
        /* Pass your questions in here */
        {
            type: "input",
            name: "cfAccountId",
            message: "What's your Cloudflare Account ID?",
            default: false,
        },
        /* Pass your questions in here */
        {
            type: "input",
            name: "cfApiToken",
            message: "What's your Cloudflare API Token?",
            default: false,
        },
    ])
    .then((answers) => {
        shell.env["CLOUDFLARE_API_TOKEN"] = answers.cfApiToken;
        shell.exec(
            `echo ${answers.cfAccountId} | npx wrangler secret put CF_ACCOUNT_ID`,
            { silent: true },
        );
        shell.exec(
            `echo ${answers.cfApiToken} | npx wrangler secret put CF_BEARER_TOKEN`,
            { silent: true },
        );
    })
    .catch((error) => {
        console.log(error);
        if (error.isTtyError) {
            // Prompt couldn't be rendered in the current environment
        } else {
            // Something else went wrong
        }
    });
