import { $, ProcessOutput } from "zx";
import path from "path";
import { homedir } from "node:os";

interface SecretItem {
    name: string;
    type: string;
}

interface AccountInfo {
    id: string;
    name: string;
}

interface TokenValidationResponse {
    success: boolean;
    result?: {
        id: string;
        status: string;
    };
    errors?: Array<{ code: number; message: string }>;
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

    async getAccounts(): Promise<AccountInfo[]> {
        try {
            const result = await $({ quiet: true })`npx wrangler whoami`;
            const accounts = this.parseAccountsFromTable(result.stdout);
            
            // If table parsing failed, fall back to single account
            if (accounts.length === 0) {
                const accountId = await this.getAccountId();
                if (accountId) {
                    return [{ id: accountId, name: `Account ${accountId.slice(-6)}` }];
                }
            }
            
            return accounts;
        } catch (error) {
            if (error instanceof ProcessOutput) {
                throw new Error(error.stderr || error.stdout);
            }
            throw error;
        }
    }

    private parseAccountsFromTable(output: string): AccountInfo[] {
        const accounts: AccountInfo[] = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            // Skip header and separator lines
            if (!line.includes('│') || line.includes('Account Name') || line.includes('─')) {
                continue;
            }
            
            const parts = line.split('│').map(part => part.trim()).filter(Boolean);
            
            if (parts.length >= 2) {
                const [name, id] = parts;
                
                // Validate account ID format (32 hex characters)
                if (/^[0-9a-f]{32}$/.test(id)) {
                    accounts.push({ id, name });
                }
            }
        }
        
        return accounts;
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

    static async validateToken(
        token: string,
    ): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch(
                "https://api.cloudflare.com/client/v4/user/tokens/verify",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (!response.ok) {
                if (response.status === 401) {
                    return { valid: false, error: "Invalid or expired token" };
                }
                if (response.status === 403) {
                    return {
                        valid: false,
                        error: "Token lacks required permissions",
                    };
                }
                return {
                    valid: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            const data: TokenValidationResponse = await response.json();

            if (!data.success) {
                const errorMessage = data.errors?.[0]?.message || "Token validation failed";
                return { valid: false, error: errorMessage };
            }

            if (data.result?.status !== "active") {
                return { valid: false, error: "Token is not active" };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Network error during validation",
            };
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

