import { CloudflareClient } from "../lib/cloudflare.js";
import { getServerPkgDir } from "../lib/config.js";
import path from "path";

export async function enableStorage() {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);

    try {
        console.log("Enabling storage...");

        const success = await cloudflare.setCloudflareSecrets({
            CF_STORAGE_ENABLED: "true",
        });

        if (success) {
            console.log("✅ Storage enabled successfully!");
        } else {
            console.error("❌ Failed to enable storage");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error enabling storage:", error);
        process.exit(1);
    }
}

export async function disableStorage() {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);

    try {
        console.log("Disabling storage...");

        const success = await cloudflare.setCloudflareSecrets({
            CF_STORAGE_ENABLED: "false",
        });

        if (success) {
            console.log("✅ Storage disabled successfully!");
        } else {
            console.error("❌ Failed to disable storage");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error disabling storage:", error);
        process.exit(1);
    }
}
