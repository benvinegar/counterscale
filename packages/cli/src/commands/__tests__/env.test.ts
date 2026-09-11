import { describe, it, expect, vi, beforeEach } from "vitest";
import { envCommand, SECRETS_BY_ALIAS } from "../env.js";
import { CloudflareClient } from "../../lib/cloudflare.js";
import { getServerPkgDir } from "../../lib/config.js";
import { select, isCancel, cancel } from "@clack/prompts";
import {
    promptApiToken,
    promptTrackerScriptName,
    getScriptSnippet,
} from "../../lib/ui.js";

// Mock dependencies
vi.mock("../../lib/cloudflare.js", () => ({
    CloudflareClient: vi.fn(),
}));

vi.mock("../../lib/config.js");
vi.mock("@clack/prompts");
vi.mock("../../lib/ui.js");
vi.mock("path");

describe("env.ts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getServerPkgDir).mockReturnValue("/mock/server/dir");
    });

    describe("SECRETS_BY_ALIAS", () => {
        it("should contain token secret configuration", () => {
            const tokenSecret = SECRETS_BY_ALIAS.get("token");
            expect(tokenSecret).toBeDefined();
            expect(tokenSecret?.key).toBe("CF_BEARER_TOKEN");
            expect(tokenSecret?.name).toBe("Cloudflare API Token");
            expect(tokenSecret?.description).toBe(
                "Token used to authenticate with Cloudflare API",
            );
            expect(tokenSecret?.prompt).toBe(promptApiToken);
        });

        it("should contain tracker-script secret configuration", () => {
            const trackerSecret = SECRETS_BY_ALIAS.get("tracker-script");
            expect(trackerSecret).toBeDefined();
            expect(trackerSecret?.key).toBe("CF_TRACKER_SCRIPT_NAME");
            expect(trackerSecret?.name).toBe("Tracker Script Name");
            expect(trackerSecret?.description).toBe(
                "Custom name for the tracker.js file served from the server",
            );
            expect(trackerSecret?.prompt).toBe(promptTrackerScriptName);
        });
    });

    describe("envCommand", () => {
        it("should update secret when valid secret key is provided", async () => {
            vi.mocked(promptApiToken).mockResolvedValue("mock-api-token");
            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            const mockGetAccountId = vi
                .fn()
                .mockResolvedValue("1234567890abcdef1234567890abcdef");

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            await envCommand("token");

            expect(promptApiToken).toHaveBeenCalledWith(
                "1234567890abcdef1234567890abcdef",
            );
            expect(mockSetSecrets).toHaveBeenCalledWith({
                CF_BEARER_TOKEN: "mock-api-token",
            });
        });

        it("should show script snippet when updating tracker script", async () => {
            vi.mocked(promptTrackerScriptName).mockResolvedValue(
                "custom-tracker",
            );
            vi.mocked(getScriptSnippet).mockReturnValue("mock-snippet");
            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            const mockGetAccountId = vi
                .fn()
                .mockResolvedValue("1234567890abcdef1234567890abcdef");

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await envCommand("tracker-script");

            expect(mockGetAccountId).not.toHaveBeenCalled();
            expect(promptTrackerScriptName).toHaveBeenCalledWith(undefined);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Use this HTML snippet"),
            );
            expect(consoleSpy).toHaveBeenCalledWith("mock-snippet");

            consoleSpy.mockRestore();
        });

        it("should exit with error when invalid secret key is provided", async () => {
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const processSpy = vi
                .spyOn(process, "exit")
                .mockImplementation(() => {
                    throw new Error("process.exit");
                });

            await expect(envCommand("invalid-secret")).rejects.toThrow(
                "process.exit",
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                "❌ Unknown secret: invalid-secret",
            );
            expect(processSpy).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should prompt for secret selection when no secret key provided", async () => {
            vi.mocked(select).mockResolvedValue("token");
            vi.mocked(promptApiToken).mockResolvedValue("mock-api-token");
            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            const mockGetAccountId = vi
                .fn()
                .mockResolvedValue("1234567890abcdef1234567890abcdef");

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            await envCommand();

            expect(select).toHaveBeenCalledWith({
                message: "Which secret would you like to update?",
                options: expect.arrayContaining([
                    expect.objectContaining({
                        value: "token",
                        label: "Cloudflare API Token (token)",
                    }),
                    expect.objectContaining({
                        value: "tracker-script",
                        label: "Tracker Script Name (tracker-script)",
                    }),
                ]),
            });
        });

        it("should cancel operation when user cancels selection", async () => {
            vi.mocked(select).mockResolvedValue(undefined);
            vi.mocked(isCancel).mockReturnValue(true);
            const processSpy = vi
                .spyOn(process, "exit")
                .mockImplementation(() => {
                    throw new Error("process.exit");
                });

            await expect(envCommand()).rejects.toThrow("process.exit");

            expect(cancel).toHaveBeenCalledWith("Operation canceled.");
            expect(processSpy).toHaveBeenCalledWith(0);

            processSpy.mockRestore();
        });

        it("should handle secret update failure", async () => {
            vi.mocked(promptApiToken).mockResolvedValue("mock-api-token");
            const mockSetSecrets = vi.fn().mockResolvedValue(false);
            const mockGetAccountId = vi
                .fn()
                .mockResolvedValue("1234567890abcdef1234567890abcdef");

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const processSpy = vi
                .spyOn(process, "exit")
                .mockImplementation(() => {
                    throw new Error("process.exit");
                });

            await expect(envCommand("token")).rejects.toThrow("process.exit");

            expect(consoleSpy).toHaveBeenCalledWith(
                "❌ Failed to update Cloudflare API Token",
            );
            expect(processSpy).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should handle errors during secret update", async () => {
            vi.mocked(promptApiToken).mockRejectedValue(
                new Error("Prompt error"),
            );
            const mockGetAccountId = vi
                .fn()
                .mockResolvedValue("1234567890abcdef1234567890abcdef");

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    getAccountId: mockGetAccountId,
                } as any;
            });
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const processSpy = vi
                .spyOn(process, "exit")
                .mockImplementation(() => {
                    throw new Error("process.exit");
                });

            await expect(envCommand("token")).rejects.toThrow("process.exit");

            expect(consoleSpy).toHaveBeenCalledWith(
                "❌ Error updating secret:",
                expect.any(Error),
            );
            expect(processSpy).toHaveBeenCalledWith(1);

            consoleSpy.mockRestore();
            processSpy.mockRestore();
        });

        it("should fall back to user-token validation when account ID lookup fails", async () => {
            vi.mocked(promptApiToken).mockResolvedValue("mock-api-token");
            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            const mockGetAccountId = vi
                .fn()
                .mockRejectedValue(new Error("Not authenticated"));

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            await envCommand("token");

            expect(promptApiToken).toHaveBeenCalledWith(undefined);
            expect(mockSetSecrets).toHaveBeenCalledWith({
                CF_BEARER_TOKEN: "mock-api-token",
            });
        });

        it("should fall back to user-token validation when no account ID is found", async () => {
            vi.mocked(promptApiToken).mockResolvedValue("mock-api-token");
            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            const mockGetAccountId = vi.fn().mockResolvedValue(null);

            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    setCloudflareSecrets: mockSetSecrets,
                    getAccountId: mockGetAccountId,
                } as any;
            });

            await envCommand("token");

            expect(promptApiToken).toHaveBeenCalledWith(undefined);
            expect(mockSetSecrets).toHaveBeenCalledWith({
                CF_BEARER_TOKEN: "mock-api-token",
            });
        });

        it("should throw error when secret configuration not found", async () => {
            vi.mocked(select).mockResolvedValue("nonexistent");
            vi.mocked(isCancel).mockReturnValue(false);
            vi.spyOn(process, "exit").mockImplementation(() => {
                throw new Error("process.exit");
            });

            await expect(envCommand()).rejects.toThrow("process.exit");
        });
    });
});
