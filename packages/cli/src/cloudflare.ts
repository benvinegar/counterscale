import { $, ProcessOutput } from "zx";
import path from "path";
import { homedir } from "node:os";

const WRANGLER_CONFIG_PATH = path.join(
    homedir(),
    ".counterscale",
    "wrangler.json",
);

export async function getAccountId(): Promise<string | null> {
    try {
        const result = await $({ quiet: true })`npx wrangler whoami`;
        const match = result.stdout.match(/([0-9a-f]{32})/);
        return match ? match[0] : null;
    } catch (error) {
        if (error instanceof ProcessOutput) {
            throw new Error(error.stderr || error.stdout);
        }
        throw error;
    }
}

export async function fetchCloudflareSecrets(): Promise<string> {
    try {
        const result =
            await $`npx wrangler secret list --config ${WRANGLER_CONFIG_PATH}`;
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

export async function getCloudflareSecrets(): Promise<Record<string, string>> {
    let rawSecrets: string;
    try {
        rawSecrets = await fetchCloudflareSecrets();
    } catch (err) {
        // worker not created yet
        if (typeof err === "string" && err.indexOf("[code: 10007]") !== -1) {
            return {};
        }
        throw err;
    }

    const secretsList = JSON.parse(rawSecrets) as SecretItem[];
    const secrets: Record<string, string> = {};
    secretsList.forEach((secret: SecretItem) => {
        secrets[secret.name] = secret.type;
    });
    return secrets;
}

export async function setCloudflareSecrets(
    secrets: Record<string, string>,
): Promise<boolean> {
    for (const [key, value] of Object.entries(secrets)) {
        try {
            await $`echo ${value} | npx wrangler secret put ${key} --config ${WRANGLER_CONFIG_PATH}`;
        } catch (err) {
            return false;
        }
    }
    return true;
}

export async function deploy(): Promise<string> {
    const result =
        await $`npx wrangler deploy --config ${WRANGLER_CONFIG_PATH}`;
    const match = result.stdout.match(
        /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
    );
    return match ? "https://" + match[0] : "<unknown>";
}
