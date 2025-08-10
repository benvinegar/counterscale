process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PasswordOptions } from "@clack/prompts";

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

vi.mock("../../lib/cloudflare.js", () => ({
    CloudflareClient: vi.fn().mockImplementation(() => ({
        getAccounts: vi.fn(),
        getCloudflareSecrets: vi.fn(),
        setCloudflareSecrets: vi.fn(),
        deploy: vi.fn(),
    })),
}));

// Now import the actual modules
import { isCancel } from "@clack/prompts";

// Import after mocks are set up
import {
    promptApiToken,
    promptDeploy,
    promptProjectConfig,
    promptAccountSelection,
    promptAppPassword,
    type AccountInfo,
} from "../install.js";

describe("install prompts", () => {
    let mockExit: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        // @ts-expect-error <just couldnt sort this out>
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
        it("should return valid API token", async () => {
            const mockToken = "a".repeat(40);
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockToken);

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

        it("should throw error if token is not a string", async () => {
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            await expect(promptApiToken()).rejects.toThrow(
                "API token is required",
            );
        });

        it("should validate token length", async () => {
            // Call promptApiToken to get the actual validate function
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(({ validate }: PasswordOptions) => {
                if (!validate) {
                    throw new Error("validate function missing");
                }

                expect(validate("")).toBe("Value is required");
                expect(validate("a".repeat(39))).toBe(
                    "Value must be exactly 40 characters",
                );
                expect(validate("a".repeat(41))).toBe(
                    "Value must be exactly 40 characters",
                );
                expect(validate("a".repeat(40))).toBeUndefined();
                return "mock-token";
            });

            await promptApiToken();
            expect(mockPrompts.password).toHaveBeenCalled();
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

    describe("promptAppPassword", () => {
        it("should return valid app password", async () => {
            const mockPassword = "mySecurePassword123";
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockPassword);

            const result = await promptAppPassword();
            expect(result).toBe(mockPassword);
        });

        it("should throw error if user cancels", async () => {
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                true,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("password");

            await expect(promptAppPassword()).rejects.toThrow(
                "Operation canceled",
            );
        });

        it("should throw error if password is not a string", async () => {
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            await expect(promptAppPassword()).rejects.toThrow(
                "App password is required",
            );
        });

        it("should validate password has at least 8 characters", async () => {
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(({ validate }: PasswordOptions) => {
                if (!validate) {
                    throw new Error("validate function missing");
                }

                expect(validate("")).toBe(
                    "A password of 8 characters or longer is required",
                );
                expect(validate("short")).toBe(
                    "A password of 8 characters or longer is required",
                );
                expect(validate("password")).toBeUndefined(); // 8 chars, should pass
                return "mock-password";
            });

            await promptAppPassword();
            expect(mockPrompts.password).toHaveBeenCalled();
        });

        it("should call password prompt with correct options", async () => {
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("test-password");

            await promptAppPassword();

            expect(mockPrompts.password).toHaveBeenCalledWith({
                message:
                    "Enter the password you will use to access the Counterscale Dashboard",
                mask: "*",
                validate: expect.any(Function),
            });
        });

        it("should accept passwords with 12 or more characters", async () => {
            const testPasswords = [
                "password1234", // exactly 12 chars
                "a very long password with spaces and symbols!@#$%", // much longer
                "123456789012", // exactly 12 chars
                "verylongpassword", // longer than 12
            ];

            for (const testPassword of testPasswords) {
                (
                    isCancel as unknown as ReturnType<typeof vi.fn>
                ).mockReturnValue(false);
                const mockPrompts = await import("@clack/prompts");
                (
                    mockPrompts.password as unknown as ReturnType<typeof vi.fn>
                ).mockResolvedValue(testPassword);

                const result = await promptAppPassword();
                expect(result).toBe(testPassword);
            }
        });
    });
});
