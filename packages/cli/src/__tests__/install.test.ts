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
}));

// Now import the actual modules
import { isCancel } from "@clack/prompts";

// Import after mocks are set up
import {
    promptApiToken,
    promptDeploy,
    promptProjectConfig,
} from "../install.js";

describe("install prompts", () => {
    let mockExit: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        // @ts-expect-error <just couldnt sort this out>
        mockExit = vi
            .spyOn(process, "exit")
            .mockImplementation((...args: unknown[]) => {
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

        it("should validate token characters", async () => {
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(({ validate }: PasswordOptions) => {
                if (!validate) {
                    throw new Error("validate function missing");
                }

                expect(validate("a".repeat(39) + "!")).toBe(
                    "Value must only have alphanumeric characters and underscores",
                );
                expect(validate("a".repeat(39) + "_")).toBeUndefined();
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
});
