import { CloudflareClient } from "../lib/cloudflare.js";
import { getServerPkgDir } from "../lib/config.js";
import { promptApiToken } from "../lib/ui.js";
import { select, isCancel, cancel } from "@clack/prompts";
import path from "path";

type SupportedSecret = "CF_BEARER_TOKEN";

interface SecretConfig {
    key: SupportedSecret;
    name: string;
    description: string;
    prompt: () => Promise<string>;
}

export const SECRETS_BY_ALIAS = new Map<string, SecretConfig>([
    [
        "token",
        {
            key: "CF_BEARER_TOKEN",
            name: "Cloudflare API Token",
            description: "Token used to authenticate with Cloudflare API",
            prompt: promptApiToken,
        },
    ],
]);

export async function envCommand(secretKey?: string) {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);

    try {
        let selectedSecret: SecretConfig;

        if (secretKey) {
            const matchingSecret = SECRETS_BY_ALIAS.get(secretKey);

            if (!matchingSecret) {
                console.error(`❌ Unknown secret: ${secretKey}`);
                console.log("Supported secrets:");
                SECRETS_BY_ALIAS.forEach((secret, alias) => {
                    console.log(`  - ${secret.name} (alias: ${alias})`);
                });
                process.exit(1);
            }
            selectedSecret = matchingSecret;
        } else {
            const selection = await select({
                message: "Which secret would you like to update?",
                options: Array.from(SECRETS_BY_ALIAS.entries()).map(
                    ([alias, secret]) => ({
                        value: alias,
                        label: `${secret.name} (${alias})`,
                        hint: secret.description,
                    }),
                ),
            });

            if (isCancel(selection)) {
                cancel("Operation canceled.");
                process.exit(0);
            }

            const selectedSecretConfig = SECRETS_BY_ALIAS.get(
                selection as string,
            );
            if (!selectedSecretConfig) {
                throw new Error(
                    `Secret configuration not found for selection: ${selection}`,
                );
            }
            selectedSecret = selectedSecretConfig;
        }

        console.log(`Updating ${selectedSecret.name}...`);

        const secretValue = await selectedSecret.prompt();

        const success = await cloudflare.setCloudflareSecrets({
            [selectedSecret.key]: secretValue,
        });

        if (success) {
            console.log(`✅ ${selectedSecret.name} updated successfully!`);
        } else {
            console.error(`❌ Failed to update ${selectedSecret.name}`);
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error updating secret:", error);
        process.exit(1);
    }
}
