import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import inquirer from "inquirer";
import { existsSync } from "node:fs";
import {
    getServerPkgDir,
    makePathsAbsolute,
    getWorkerAndDatasetName,
    readInitialServerConfig,
    stageDeployConfig,
} from "../config.js";
import { join } from "node:path";

// Mock external dependencies
vi.mock("inquirer", () => ({
    default: {
        prompt: vi.fn(),
    },
}));

vi.mock("figlet", () => ({
    default: {
        textSync: vi.fn(() => "Counterscale"),
    },
}));

vi.mock("path", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:path")>();
    return {
        ...actual,
        dirname: vi.fn(() => "/some/path/to/somewhere"),
    };
});

// Mock fs methods
vi.mock("fs", async () => {
    const actual = await vi.importActual("node:fs");
    return {
        ...actual,
        existsSync: vi.fn(),
        readFileSync: vi.fn(() => "{}"),
        writeFileSync: vi.fn(),
    };
});

describe("CLI Functions", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(inquirer.prompt).mockResolvedValue({
            workerName: "test-worker",
            analyticsDataset: "test-dataset",
        });
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("getServerPkgDir", () => {
        it("should find package in node_modules", async () => {
            const { dirname } = await import("node:path");
            const { existsSync } = await import("node:fs");
            vi.mocked(dirname).mockReturnValue(
                "/some/path/to/node_modules/@counterscale/cli/dist",
            );

            // Mock existsSync to return true only for the node_modules path
            const expectedPath = join(
                "/some/path/to/node_modules",
                "@counterscale",
                "server",
            );
            vi.mocked(existsSync).mockImplementation((p) => p === expectedPath);

            const result = getServerPkgDir();

            expect(existsSync).toBeCalled();
            expect(result).toBe(expectedPath);
            expect(existsSync).toHaveBeenCalledWith(expectedPath);
        });

        it("should check monorepo path if node_modules not found", async () => {
            const { dirname } = await import("node:path");
            const { existsSync } = await import("node:fs");
            vi.mocked(dirname).mockReturnValue(
                "/monorepo/checkout/counterscale/packages/cli/dist",
            );

            const expectedPath = join(
                "/monorepo/checkout/counterscale/packages/server",
            );
            // Mock existsSync to return false for node_modules but true for monorepo path
            vi.mocked(existsSync).mockImplementation((p) => p === expectedPath);

            const result = getServerPkgDir();
            expect(result).toMatch(/packages\/server$/);
        });

        it("should throw if package not found", async () => {
            // Mock both paths to not exist
            vi.mocked(existsSync).mockReturnValue(false);

            expect(() => getServerPkgDir()).toThrow(
                /Could not find @counterscale\/server package/,
            );
        });
    });

    describe("makePathsAbsolute", () => {
        it("should convert relative paths to absolute in a flat object", () => {
            const input = {
                path1: "relative/path/file.txt",
                path2: "/absolute/path/file.txt",
                nonPath: "string-without-slash",
            };
            const baseDir = "/base/dir";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                path1: "/base/dir/relative/path/file.txt",
                path2: "/absolute/path/file.txt",
                nonPath: "string-without-slash",
            });
        });

        it("should handle nested objects", () => {
            const input = {
                nested: {
                    path: "relative/nested/file.txt",
                    config: {
                        location: "another/path/config.json",
                    },
                },
                topLevel: "/absolute/top/level.txt",
            };
            const baseDir = "/root";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                nested: {
                    path: "/root/relative/nested/file.txt",
                    config: {
                        location: "/root/another/path/config.json",
                    },
                },
                topLevel: "/absolute/top/level.txt",
            });
        });

        it("should handle arrays", () => {
            const input = {
                paths: [
                    "relative/path1.txt",
                    "/absolute/path2.txt",
                    { nestedPath: "relative/path3.txt" },
                ],
            };
            const baseDir = "/base";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                paths: [
                    "/base/relative/path1.txt",
                    "/absolute/path2.txt",
                    { nestedPath: "/base/relative/path3.txt" },
                ],
            });
        });

        it("should handle non-object inputs", () => {
            expect(makePathsAbsolute(null, "/base")).toBeNull();
            expect(makePathsAbsolute(undefined, "/base")).toBeUndefined();
            expect(makePathsAbsolute("simple/path", "/base")).toBe(
                "simple/path",
            );
            expect(makePathsAbsolute(42, "/base")).toBe(42);
        });
    });

    describe("getWorkerAndDatasetName", () => {
        it("should extract worker name and dataset from config", () => {
            const config = {
                name: "test-worker",
                analytics_engine_datasets: [{ dataset: "test-dataset" }],
            };

            const result = getWorkerAndDatasetName(config);

            expect(result).toEqual({
                workerName: "test-worker",
                analyticsDataset: "test-dataset",
            });
        });
    });

    describe("readInitialServerConfig", () => {
        it("should read and parse wrangler.json from server package", async () => {
            const mockConfig = {
                name: "counterscale",
                analytics_engine_datasets: [{ dataset: "default-dataset" }],
            };

            // Mock existsSync to make getServerPkgDir work
            const { existsSync } = await import("node:fs");
            vi.mocked(existsSync).mockReturnValue(true);

            // Mock readFileSync
            const { readFileSync } = await import("node:fs");
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

            const result = readInitialServerConfig();

            expect(result).toEqual(mockConfig);
            expect(readFileSync).toHaveBeenCalledWith(
                expect.stringMatching(/wrangler\.json$/),
                "utf8",
            );
        });
    });

    describe("stageDeployConfig", () => {
        it("should write updated config with absolute paths", async () => {
            // Mock existsSync to make getServerPkgDir work
            const { existsSync, writeFileSync } = await import("node:fs");
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(writeFileSync);

            const initialConfig = {
                name: "old-name",
                analytics_engine_datasets: [{ dataset: "old-dataset" }],
                build: {
                    command: "npm run build",
                    cwd: "relative/path",
                },
            };

            await stageDeployConfig(
                "/target/wrangler.json",
                initialConfig,
                "new-worker",
                "new-dataset",
            );

            // Verify writeFileSync was called with the correct arguments
            expect(writeFileSync).toHaveBeenCalledWith(
                "/target/wrangler.json",
                expect.any(String),
            );

            // Parse the written config to verify its contents
            const writtenConfig = JSON.parse(
                vi.mocked(writeFileSync).mock.calls[0][1] as string,
            );

            // Verify worker name and dataset were updated
            expect(writtenConfig.name).toBe("new-worker");
            expect(writtenConfig.analytics_engine_datasets[0].dataset).toBe(
                "new-dataset",
            );

            // Verify paths were made absolute
            expect(writtenConfig.build.cwd).toMatch(/^\//); // Should start with /
        });

        it("should include account_id when provided", async () => {
            const { existsSync, writeFileSync } = await import("node:fs");
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(writeFileSync);

            const initialConfig = {
                name: "old-name",
                analytics_engine_datasets: [{ dataset: "old-dataset" }],
            };

            const accountId = "1234567890abcdef1234567890abcdef";

            await stageDeployConfig(
                "/target/wrangler.json",
                initialConfig,
                "new-worker",
                "new-dataset",
                accountId,
            );

            const writtenConfig = JSON.parse(
                vi.mocked(writeFileSync).mock.calls[0][1] as string,
            );

            expect(writtenConfig.account_id).toBe(accountId);
        });

        it("should not include account_id when not provided", async () => {
            const { existsSync, writeFileSync } = await import("node:fs");
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(writeFileSync);

            const initialConfig = {
                name: "old-name",
                analytics_engine_datasets: [{ dataset: "old-dataset" }],
            };

            await stageDeployConfig(
                "/target/wrangler.json",
                initialConfig,
                "new-worker",
                "new-dataset",
            );

            const writtenConfig = JSON.parse(
                vi.mocked(writeFileSync).mock.calls[0][1] as string,
            );

            expect(writtenConfig.account_id).toBeUndefined();
        });

        it("should include observability configuration to enable logs", async () => {
            const { existsSync, writeFileSync } = await import("node:fs");
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(writeFileSync);

            const initialConfig = {
                name: "old-name",
                analytics_engine_datasets: [{ dataset: "old-dataset" }],
            };

            await stageDeployConfig(
                "/target/wrangler.json",
                initialConfig,
                "new-worker",
                "new-dataset",
            );

            const writtenConfig = JSON.parse(
                vi.mocked(writeFileSync).mock.calls[0][1] as string,
            );

            expect(writtenConfig.observability).toEqual({
                logs: {
                    enabled: true
                }
            });
        });
    });
});
