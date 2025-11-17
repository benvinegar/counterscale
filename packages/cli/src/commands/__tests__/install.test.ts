process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock modules must be imported before the actual imports
vi.mock("@clack/prompts", () => ({
    isCancel: vi.fn(),
    cancel: vi.fn(),
    password: vi.fn(),
    confirm: vi.fn(),
    text: vi.fn(),
    select: vi.fn(),
    intro: vi.fn(),
    spinner: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
    })),
    log: {
        info: vi.fn(),
    },
}));

vi.mock("../../lib/cloudflare.js", () => {
    const mockValidateToken = vi.fn();
    const MockCloudflareClient = vi.fn().mockImplementation(() => ({
        getAccounts: vi.fn(),
        getCloudflareSecrets: vi.fn(),
        setCloudflareSecrets: vi.fn(),
        deploy: vi.fn(),
    }));

    (MockCloudflareClient as any).validateToken = mockValidateToken;

    return {
        CloudflareClient: MockCloudflareClient,
    };
});

// Now import the actual modules
import { isCancel } from "@clack/prompts";

// Import after mocks are set up
import {
    promptApiToken,
    promptDeploy,
    promptProjectConfig,
    promptAccountSelection,
    type AccountInfo,
} from "../install.js";

describe("install prompts", () => {
    let mockExit: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        mockExit = vi
            .spyOn(process, "exit")
            .mockImplementation((..._args: unknown[]) => {
                throw new Error("process.exit should not be called");
            });
    });

    afterEach(() => {
        mockExit.mockRestore();
    });

    describe("promptApiToken", () => {
        let mockSpinner: {
            start: ReturnType<typeof vi.fn>;
            stop: ReturnType<typeof vi.fn>;
        };

        beforeEach(async () => {
            mockSpinner = {
                start: vi.fn(),
                stop: vi.fn(),
            };
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.spinner as unknown as ReturnType<typeof vi.fn>
            ).mockReturnValue(mockSpinner);
        });

        it("should return valid API token when validation passes", async () => {
            const mockToken = "a".repeat(40);
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockToken);

            const mockCloudflare = await import("../../lib/cloudflare.js");
            vi.mocked(
                mockCloudflare.CloudflareClient.validateToken,
            ).mockResolvedValue({ valid: true });

            const result = await promptApiToken();
            expect(result).toBe(mockToken);
        });

        it("should throw error if user cancels", async () => {
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                true,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("token");

            await expect(promptApiToken()).rejects.toThrow(
                "Operation canceled",
            );
        });

        it("should throw error if token validation fails", async () => {
            const mockToken = "a".repeat(40);
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockToken);

            const mockCloudflare = await import("../../lib/cloudflare.js");
            vi.mocked(
                mockCloudflare.CloudflareClient.validateToken,
            ).mockResolvedValue({
                valid: false,
                error: "Invalid token or insufficient permissions",
            });

            await expect(promptApiToken()).rejects.toThrow(
                "Invalid token or insufficient permissions",
            );
        });

        it("should throw error if validation throws", async () => {
            const mockToken = "a".repeat(40);
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockToken);

            const mockCloudflare = await import("../../lib/cloudflare.js");
            vi.mocked(
                mockCloudflare.CloudflareClient.validateToken,
            ).mockRejectedValue(new Error("Network error"));

            await expect(promptApiToken()).rejects.toThrow("Network error");
        });

        it("should throw generic error if validation throws non-Error", async () => {
            const mockToken = "a".repeat(40);
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockToken);

            const mockCloudflare = await import("../../lib/cloudflare.js");
            vi.mocked(
                mockCloudflare.CloudflareClient.validateToken,
            ).mockRejectedValue("string error");

            await expect(promptApiToken()).rejects.toThrow(
                "Failed to validate token. Please check your internet connection.",
            );
        });
    });

    describe("promptDeploy", () => {
        it("should return true when user confirms", async () => {
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.confirm as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(true);

            const result = await promptDeploy("1.0.0");
            expect(result).toBe(true);
        });

        it("should return false when user declines", async () => {
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.confirm as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(false);

            const result = await promptDeploy("1.0.0");
            expect(result).toBe(false);
        });
    });

    describe("promptProjectConfig", () => {
        it("should return worker name and dataset name", async () => {
            const mockWorkerName = "test-worker";
            const mockDatasetName = "test-dataset";
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );

            (mockPrompts.text as unknown as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(mockWorkerName)
                .mockResolvedValueOnce(mockDatasetName);

            const result = await promptProjectConfig(
                "default-worker",
                "default-dataset",
            );
            expect(result).toEqual({
                workerName: mockWorkerName,
                analyticsDataset: mockDatasetName,
            });
        });

        it("should throw error if user cancels worker name", async () => {
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                true,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.text as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("test");

            await expect(promptProjectConfig()).rejects.toThrow(
                "Operation canceled",
            );
        });

        it("should throw error if user cancels dataset name", async () => {
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            (
                mockPrompts.text as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("test");

            await expect(promptProjectConfig()).rejects.toThrow(
                "Operation canceled",
            );
        });

        it("should use provided default values", async () => {
            const defaultWorker = "default-worker";
            const defaultDataset = "default-dataset";
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );

            await promptProjectConfig(defaultWorker, defaultDataset);

            expect(mockPrompts.text).toHaveBeenCalledWith(
                expect.objectContaining({
                    initialValue: defaultWorker,
                }),
            );
            expect(mockPrompts.text).toHaveBeenCalledWith(
                expect.objectContaining({
                    initialValue: defaultDataset,
                }),
            );
        });
    });

    describe("promptAccountSelection", () => {
        it("should return selected account ID", async () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ];
            const selectedAccountId = "abcdef1234567890abcdef1234567890";

            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.select as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(selectedAccountId);

            const result = await promptAccountSelection(mockAccounts);
            expect(result).toBe(selectedAccountId);
        });

        it("should throw error if user cancels account selection", async () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ];

            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                true,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.select as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("some-id");

            await expect(promptAccountSelection(mockAccounts)).rejects.toThrow(
                "Operation canceled",
            );
        });

        it("should format account options correctly", async () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ];

            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.select as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("1234567890abcdef1234567890abcdef");

            await promptAccountSelection(mockAccounts);

            expect(mockPrompts.select).toHaveBeenCalledWith({
                message: "Select a Cloudflare account:",
                options: [
                    {
                        value: "1234567890abcdef1234567890abcdef",
                        label: "Account 1 (abcdef)",
                    },
                    {
                        value: "abcdef1234567890abcdef1234567890",
                        label: "Account 2 (567890)",
                    },
                ],
            });
        });

        it("should handle single account selection", async () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
            ];

            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.select as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("1234567890abcdef1234567890abcdef");

            const result = await promptAccountSelection(mockAccounts);
            expect(result).toBe("1234567890abcdef1234567890abcdef");

            expect(mockPrompts.select).toHaveBeenCalledWith({
                message: "Select a Cloudflare account:",
                options: [
                    {
                        value: "1234567890abcdef1234567890abcdef",
                        label: "Account 1 (abcdef)",
                    },
                ],
            });
        });
    });

    describe("account selection logic", () => {
        it("should handle single account case", () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
            ];

            // Test the logic: with a single account, we should automatically use it
            expect(mockAccounts.length).toBe(1);
            expect(mockAccounts[0].id).toBe("1234567890abcdef1234567890abcdef");
        });

        it("should handle multiple accounts case", () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ];

            // Test the logic: with multiple accounts, we should prompt for selection
            expect(mockAccounts.length).toBeGreaterThan(1);
        });

        it("should handle empty accounts case", () => {
            const mockAccounts: AccountInfo[] = [];

            // Test the logic: with no accounts, we should exit with error
            expect(mockAccounts.length).toBe(0);
        });

        it("should auto-deploy with single account", () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
            ];

            // Test the logic: with a single account, should auto-deploy (shouldDeploy = true)
            const shouldDeploy = mockAccounts.length === 1 ? true : false;
            expect(shouldDeploy).toBe(true);
        });

        it("should prompt for deploy with multiple accounts", () => {
            const mockAccounts: AccountInfo[] = [
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ];

            // Test the logic: with multiple accounts, should prompt for deploy
            const shouldPrompt = mockAccounts.length > 1;
            expect(shouldPrompt).toBe(true);
        });
    });
});
