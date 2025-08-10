import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { enableAuth, disableAuth, updatePassword } from "../auth.js";

// Mock dependencies
vi.mock("@clack/prompts", () => ({
    password: vi.fn(),
}));

vi.mock("../../lib/auth.js", () => ({
    generatePasswordHash: vi.fn(),
    generateJWTSecret: vi.fn(),
}));

vi.mock("../../lib/cloudflare.js", () => ({
    CloudflareClient: vi.fn(),
}));

import { password } from "@clack/prompts";
import { generatePasswordHash, generateJWTSecret } from "../../lib/auth.js";
import { CloudflareClient } from "../../lib/cloudflare.js";

describe("Auth Commands", () => {
    let mockCloudflareClient: any;
    let mockConsoleLog: MockInstance;
    let mockConsoleError: MockInstance;
    let mockProcessExit: any;

    beforeEach(() => {
        // Mock CloudflareClient instance
        mockCloudflareClient = {
            getCloudflareSecrets: vi.fn(),
            setCloudflareSecrets: vi.fn(),
        };
        (CloudflareClient as any).mockImplementation(() => mockCloudflareClient);

        // Mock console methods
        mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
        mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockProcessExit = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit called");
        });

        // Reset all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        mockConsoleLog.mockRestore();
        mockConsoleError.mockRestore();
        mockProcessExit.mockRestore();
    });

    describe("enableAuth", () => {
        it("should enable auth with new password and JWT secret when neither exist", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({});
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);
            (password as any).mockResolvedValue("testpassword123");
            (generatePasswordHash as any).mockResolvedValue("hashedpassword");
            (generateJWTSecret as any).mockReturnValue("jwtsecret");

            // Act
            await enableAuth();

            // Assert
            expect(mockCloudflareClient.getCloudflareSecrets).toHaveBeenCalledOnce();
            expect(password).toHaveBeenCalledWith({
                message: "Enter a password for authentication:",
                validate: expect.any(Function),
            });
            expect(generatePasswordHash).toHaveBeenCalledWith("testpassword123");
            expect(generateJWTSecret).toHaveBeenCalledOnce();
            expect(mockCloudflareClient.setCloudflareSecrets).toHaveBeenCalledWith({
                CF_AUTH_ENABLED: "true",
                CF_PASSWORD_HASH: "hashedpassword",
                CF_JWT_SECRET: "jwtsecret",
            });
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ Authentication enabled successfully!");
            expect(mockConsoleLog).toHaveBeenCalledWith("   Password hash has been set");
            expect(mockConsoleLog).toHaveBeenCalledWith("   JWT secret has been generated");
        });

        it("should only enable auth when password and JWT secret already exist", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({
                CF_PASSWORD_HASH: "existing",
                CF_JWT_SECRET: "existing",
            });
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);

            // Act
            await enableAuth();

            // Assert
            expect(password).not.toHaveBeenCalled();
            expect(generatePasswordHash).not.toHaveBeenCalled();
            expect(generateJWTSecret).not.toHaveBeenCalled();
            expect(mockCloudflareClient.setCloudflareSecrets).toHaveBeenCalledWith({
                CF_AUTH_ENABLED: "true",
            });
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ Authentication enabled successfully!");
        });

        it("should validate password length", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({});
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);
            let capturedValidate: any;
            (password as any).mockImplementation(({ validate }: { validate: any }) => {
                capturedValidate = validate;
                return Promise.resolve("testpassword123");
            });
            (generatePasswordHash as any).mockResolvedValue("hashedpassword");
            (generateJWTSecret as any).mockReturnValue("jwtsecret");

            // Act
            await enableAuth();

            // Assert - Test the validation function that was passed to password()
            expect(capturedValidate("short")).toBe("Password must be at least 8 characters long");
            expect(capturedValidate("")).toBe("Password must be at least 8 characters long");
            expect(capturedValidate("validpassword")).toBeUndefined();
        });

        it("should handle cloudflare secrets setting failure", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({});
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(false);
            (password as any).mockResolvedValue("testpassword123");
            (generatePasswordHash as any).mockResolvedValue("hashedpassword");
            (generateJWTSecret as any).mockReturnValue("jwtsecret");

            // Act & Assert
            await expect(enableAuth()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Failed to set authentication secrets");
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it("should handle errors during execution", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockRejectedValue(new Error("API Error"));

            // Act & Assert
            await expect(enableAuth()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Error enabling authentication:", expect.any(Error));
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });
    });

    describe("disableAuth", () => {
        it("should disable auth successfully", async () => {
            // Arrange
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);

            // Act
            await disableAuth();

            // Assert
            expect(mockCloudflareClient.setCloudflareSecrets).toHaveBeenCalledWith({
                CF_AUTH_ENABLED: "false",
            });
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ Authentication disabled successfully!");
            expect(mockConsoleLog).toHaveBeenCalledWith("   Password hash and JWT secret remain in place");
        });

        it("should handle cloudflare secrets setting failure", async () => {
            // Arrange
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(false);

            // Act & Assert
            await expect(disableAuth()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Failed to disable authentication");
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it("should handle errors during execution", async () => {
            // Arrange
            mockCloudflareClient.setCloudflareSecrets.mockRejectedValue(new Error("API Error"));

            // Act & Assert
            await expect(disableAuth()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Error disabling authentication:", expect.any(Error));
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });
    });

    describe("updatePassword", () => {
        it("should update password successfully when auth is enabled", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({
                CF_AUTH_ENABLED: "true",
            });
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);
            (password as any).mockResolvedValue("newpassword123");
            (generatePasswordHash as any).mockResolvedValue("newhashedpassword");

            // Act
            await updatePassword();

            // Assert
            expect(mockCloudflareClient.getCloudflareSecrets).toHaveBeenCalledOnce();
            expect(password).toHaveBeenCalledWith({
                message: "Enter new password:",
                validate: expect.any(Function),
            });
            expect(generatePasswordHash).toHaveBeenCalledWith("newpassword123");
            expect(mockCloudflareClient.setCloudflareSecrets).toHaveBeenCalledWith({
                CF_PASSWORD_HASH: "newhashedpassword",
            });
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ Password updated successfully!");
            expect(mockConsoleLog).toHaveBeenCalledWith("   Existing sessions remain valid");
        });

        it("should fail when authentication is not enabled", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({});

            // Act & Assert
            await expect(updatePassword()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith(
                "❌ Authentication is not enabled. Run 'counterscale auth enable' first."
            );
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it("should validate password length", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({
                CF_AUTH_ENABLED: "true",
            });
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(true);
            let capturedValidate: any;
            (password as any).mockImplementation(({ validate }: { validate: any }) => {
                capturedValidate = validate;
                return Promise.resolve("newpassword123");
            });
            (generatePasswordHash as any).mockResolvedValue("newhashedpassword");

            // Act
            await updatePassword();

            // Assert - Test the validation function that was passed to password()
            expect(capturedValidate("short")).toBe("Password must be at least 8 characters long");
            expect(capturedValidate("")).toBe("Password must be at least 8 characters long");
            expect(capturedValidate("validpassword")).toBeUndefined();
        });

        it("should handle cloudflare secrets setting failure", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({
                CF_AUTH_ENABLED: "true",
            });
            mockCloudflareClient.setCloudflareSecrets.mockResolvedValue(false);
            (password as any).mockResolvedValue("newpassword123");
            (generatePasswordHash as any).mockResolvedValue("newhashedpassword");

            // Act & Assert
            await expect(updatePassword()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Failed to update password");
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it("should handle errors during execution", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockRejectedValue(new Error("API Error"));

            // Act & Assert
            await expect(updatePassword()).rejects.toThrow("process.exit called");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ Error updating password:", expect.any(Error));
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it("should handle cancelled password input", async () => {
            // Arrange
            mockCloudflareClient.getCloudflareSecrets.mockResolvedValue({
                CF_AUTH_ENABLED: "true",
            });
            (password as any).mockResolvedValue(undefined); // User cancelled

            // Act
            await updatePassword();

            // Assert
            expect(generatePasswordHash).not.toHaveBeenCalled();
            expect(mockCloudflareClient.setCloudflareSecrets).not.toHaveBeenCalled();
        });
    });
});