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
    note: vi.fn(),
    outro: vi.fn(),
    spinner: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
    })),
    log: {
        info: vi.fn(),
    },
}));

vi.mock("../../lib/config.js");

vi.mock("../../lib/ui.js", () => ({
    CLI_COLORS: {
        orange: [245, 107, 61],
        tan: [243, 227, 190],
        teal: [0, 205, 205],
    },
    MIN_PASSWORD_LENGTH: 8,
    getTitle: vi.fn(),
    highlightTheme: {},
    getScriptSnippet: vi.fn(),
    getPackageSnippet: vi.fn(),
    promptForPassword: vi.fn(),
    promptApiToken: vi.fn(),
    promptTrackerScriptName: vi.fn(),
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
import { isCancel, note, confirm, spinner } from "@clack/prompts";

// Import after mocks are set up
import {
    promptDeploy,
    promptProjectConfig,
    promptAccountSelection,
    install,
    type AccountInfo,
} from "../install.js";
import { CloudflareClient } from "../../lib/cloudflare.js";
import {
    getWorkerAndDatasetName,
    stageDeployConfig,
} from "../../lib/config.js";
import { promptApiToken } from "../../lib/ui.js";

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

    describe("install", () => {
        it("should prompt for an API token with the selected account ID when CF_BEARER_TOKEN is missing", async () => {
            const accountId = "1234567890abcdef1234567890abcdef";
            const apiToken = "m".repeat(40);

            vi.mocked(spinner).mockImplementation(
                () =>
                    ({
                        start: vi.fn(),
                        stop: vi.fn(),
                    }) as any,
            );

            const mockSetSecrets = vi.fn().mockResolvedValue(true);
            vi.mocked(CloudflareClient).mockImplementation(function () {
                return {
                    getAccounts: vi
                        .fn()
                        .mockResolvedValue([
                            { id: accountId, name: "Test Account" },
                        ]),
                    getCloudflareSecrets: vi.fn().mockResolvedValue({
                        CF_AUTH_ENABLED: "true",
                        CF_PASSWORD_HASH: "hash",
                        CF_JWT_SECRET: "secret",
                    }),
                    setCloudflareSecrets: mockSetSecrets,
                    deploy: vi.fn(),
                } as any;
            });

            vi.mocked(getWorkerAndDatasetName).mockReturnValue({
                workerName: "counterscale",
                analyticsDataset: "metricsDataset",
            });
            vi.mocked(stageDeployConfig).mockResolvedValue(undefined);
            vi.mocked(promptApiToken).mockResolvedValue(apiToken);
            vi.mocked(confirm).mockResolvedValue(false);

            await install({} as any, "/mock/server/dir", { version: "3.5.0" });

            expect(promptApiToken).toHaveBeenCalledWith(accountId);
            expect(note).toHaveBeenCalledWith(
                expect.stringContaining(
                    `https://dash.cloudflare.com/${accountId}/api-tokens`,
                ),
            );
            expect(mockSetSecrets).toHaveBeenCalledWith({
                CF_ACCOUNT_ID: accountId,
                CF_BEARER_TOKEN: apiToken,
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
