import { generatePasswordHash, generateJWTSecret } from "../lib/auth.js";
import { CloudflareClient } from "../lib/cloudflare.js";
import { getServerPkgDir } from "../lib/config.js";
import { promptForPassword } from "../lib/ui.js";
import path from "path";

export async function enableAuth() {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);
    
    try {
        console.log("Enabling authentication...");
        
        // Get existing secrets
        const existingSecrets = await cloudflare.getCloudflareSecrets();
        const secretsToSet: Record<string, string> = {};
        
        // Always set CF_AUTH_ENABLED to true
        secretsToSet.CF_AUTH_ENABLED = "true";
        
        // Set password hash if it doesn't exist
        if (!existingSecrets.CF_PASSWORD_HASH) {
            const userPassword = await promptForPassword("Enter a password for authentication:");
            const passwordHash = await generatePasswordHash(userPassword);
            secretsToSet.CF_PASSWORD_HASH = passwordHash;
        }
        
        // Set JWT secret if it doesn't exist
        if (!existingSecrets.CF_JWT_SECRET) {
            secretsToSet.CF_JWT_SECRET = generateJWTSecret();
        }
        
        // Set the secrets
        const success = await cloudflare.setCloudflareSecrets(secretsToSet);
        
        if (success) {
            console.log("✅ Authentication enabled successfully!");
            if (secretsToSet.CF_PASSWORD_HASH) {
                console.log("   Password hash has been set");
            }
            if (secretsToSet.CF_JWT_SECRET) {
                console.log("   JWT secret has been generated");
            }
        } else {
            console.error("❌ Failed to set authentication secrets");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error enabling authentication:", error);
        process.exit(1);
    }
}

export async function disableAuth() {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);
    
    try {
        console.log("Disabling authentication...");
        
        // Only set CF_AUTH_ENABLED to false, leave other secrets intact
        const success = await cloudflare.setCloudflareSecrets({
            CF_AUTH_ENABLED: "false"
        });
        
        if (success) {
            console.log("✅ Authentication disabled successfully!");
            console.log("   Password hash and JWT secret remain in place");
        } else {
            console.error("❌ Failed to disable authentication");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error disabling authentication:", error);
        process.exit(1);
    }
}

export async function updatePassword() {
    const serverPkgDir = getServerPkgDir();
    const configPath = path.join(serverPkgDir, "wrangler.json");
    const cloudflare = new CloudflareClient(configPath);
    
    try {
        console.log("Updating authentication password...");
        
        // Check if authentication is set up
        const existingSecrets = await cloudflare.getCloudflareSecrets();
        
        if (!existingSecrets.CF_AUTH_ENABLED) {
            console.error("❌ Authentication is not enabled. Run 'counterscale auth enable' first.");
            process.exit(1);
        }
        
        // Prompt for new password
        const newPassword = await promptForPassword("Enter new password:");
        const passwordHash = await generatePasswordHash(newPassword);
        
        // Update only the password hash, keep JWT secret intact
        const success = await cloudflare.setCloudflareSecrets({
            CF_PASSWORD_HASH: passwordHash
        });
        
        if (success) {
            console.log("✅ Password updated successfully!");
            console.log("   Existing sessions remain valid");
        } else {
            console.error("❌ Failed to update password");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error updating password:", error);
        process.exit(1);
    }
}