import { $, ProcessOutput } from "zx";
import path from "path";
import { homedir } from "node:os";

interface SecretItem {
    name: string;
    type: string;
}

export class CloudflareClient {
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath =
            configPath ||
            path.join(homedir(), ".counterscale", "wrangler.json");
    }

    async getAccountId(): Promise<string | null> {
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

    private async fetchCloudflareSecrets(): Promise<string> {
        try {
            const result =
                await $`npx wrangler secret list --config ${this.configPath}`;
            return result.stdout;
        } catch (error) {
            throw error instanceof ProcessOutput
                ? error.stdout || error.stderr
                : error;
        }
    }

    async getCloudflareSecrets(): Promise<Record<string, string>> {
        let rawSecrets: string;
        try {
            rawSecrets = await this.fetchCloudflareSecrets();
        } catch (err) {
            // worker not created yet
            if (
                typeof err === "string" &&
                err.indexOf("[code: 10007]") !== -1
            ) {
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

    async setCloudflareSecrets(
        secrets: Record<string, string>,
    ): Promise<boolean> {
        for (const [key, value] of Object.entries(secrets)) {
            try {
                await $`echo ${value} | npx wrangler secret put ${key} --config ${this.configPath}`;
            } catch {
                return false;
            }
        }
        return true;
    }

    async deploy(verbose: boolean, version: string): Promise<string> {
        try {
            const p = $({
                quiet: true,
            })`npx wrangler deploy --config ${this.configPath} --var VERSION:${version}`;

            let output = "";
            for await (const text of p) {
                output += text;
                if (verbose) {
                    console.log(text);
                }
            }

            const match = output.match(
                /([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i,
            );
            return match ? "https://" + match[0] : "<unknown>";
        } catch (error) {
            if (error instanceof ProcessOutput) {
                throw new Error(error.stderr || error.stdout);
            }
            throw error;
        }
    }
}
