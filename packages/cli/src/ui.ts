import { log } from "@clack/prompts";
import figlet from "figlet";
import chalk from "chalk";
import { highlight } from "cli-highlight";

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

export function getScriptSnippet(deployUrl: string) {
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

export function info(...str: string[]): void {
    log.info(str.join(" "));
}
