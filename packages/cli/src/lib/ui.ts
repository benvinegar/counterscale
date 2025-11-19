import figlet from "figlet";
import chalk from "chalk";
import { highlight } from "cli-highlight";
import { password, text, isCancel, cancel, spinner } from "@clack/prompts";
import { CloudflareClient } from "./cloudflare.js";

export const CLI_COLORS: Record<string, [number, number, number]> = {
    orange: [245, 107, 61],
    tan: [243, 227, 190],
    teal: [0, 205, 205],
};

export const highlightTheme = {
    class: chalk.rgb(...CLI_COLORS.teal),
    literal: chalk.rgb(...CLI_COLORS.teal),
    keyword: chalk.rgb(...CLI_COLORS.orange),
    built_in: chalk.rgb(...CLI_COLORS.orange),
    name: chalk.rgb(...CLI_COLORS.orange),
    string: chalk.rgb(...CLI_COLORS.tan),
    default: chalk.white,
    plain: chalk.white,
};

export function getTitle(
    counterscaleVersion: string,
    homepage: string,
): string {
    const title = chalk.rgb(...CLI_COLORS.orange)(
        figlet.textSync("Counterscale", {
            font: "Slant",
        }),
    );

    const subtitle = [
        chalk.rgb(...CLI_COLORS.tan).underline(homepage),
        "•",
        chalk.rgb(...CLI_COLORS.tan)(counterscaleVersion),
    ].join(" ");

    return `${title}\n${subtitle}`;
}

export function getScriptSnippet(
    deployUrl: string,
    scriptName: string = "tracker",
) {
    return highlight(
        `
<script
    id="counterscale-script"
    data-site-id="YOUR_UNIQUE_SITE_ID__CHANGE_THIS"
    src="${deployUrl}/${scriptName}.js"
    defer
></script>`,
        { language: "html", theme: highlightTheme },
    );
}

export function getPackageSnippet(
    deployUrl: string,
    counterscaleVersion: string,
) {
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

export const MIN_PASSWORD_LENGTH = 8;

export async function promptForPassword(
    message: string = "Enter a password for authentication:",
): Promise<string> {
    const userPassword = await password({
        message,
        mask: "*",
        validate: (val) => {
            if (val.length < MIN_PASSWORD_LENGTH) {
                return `A password of ${MIN_PASSWORD_LENGTH} characters or longer is required`;
            }
        },
    });

    if (isCancel(userPassword)) {
        cancel("Operation canceled.");
        if (process.env.NODE_ENV === "test") {
            throw new Error("Operation canceled");
        }
        process.exit(0);
    }

    if (typeof userPassword !== "string") {
        throw new Error("Password is required");
    }

    return userPassword;
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
        cancel("Operation canceled.");
        if (process.env.NODE_ENV === "test") {
            throw new Error("Operation canceled");
        }
        process.exit(0);
    }

    if (typeof cfApiToken !== "string" || cfApiToken.length === 0) {
        throw new Error("API token is required");
    }

    const s = spinner();
    s.start("Validating token...");

    try {
        const result = await CloudflareClient.validateToken(cfApiToken);
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

export async function promptTrackerScriptName(): Promise<string> {
    const scriptName = await text({
        message:
            "Enter the tracker script name (e.g., tracker, analytics, counter, etc):",
        placeholder: "tracker",
        defaultValue: "tracker",
        validate: (value) => {
            if (typeof value !== "string" || value.length === 0) {
                return "Script name is required";
            }

            // Check for invalid filename characters
            const invalidChars = /[<>:"/\\|?*]/;
            if (invalidChars.test(value)) {
                return "Script name contains invalid characters";
            }

            if (value.length > 100) {
                return "Script name is too long (max 100 characters)";
            }

            return undefined;
        },
    });

    if (isCancel(scriptName)) {
        cancel("Operation canceled.");
        if (process.env.NODE_ENV === "test") {
            throw new Error("Operation canceled");
        }
        process.exit(0);
    }

    if (typeof scriptName !== "string" || scriptName.length === 0) {
        throw new Error("Script name is required");
    }

    return scriptName;
}
