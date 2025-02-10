import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import inquirer from "inquirer";
import { existsSync } from "node:fs";
import { getServerPkgDir, makePathsAbsolute } from "../config.js";
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
                nonPath: "string-without-slash"
            };
            const baseDir = "/base/dir";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                path1: "/base/dir/relative/path/file.txt",
                path2: "/absolute/path/file.txt",
                nonPath: "string-without-slash"
            });
        });

        it("should handle nested objects", () => {
            const input = {
                nested: {
                    path: "relative/nested/file.txt",
                    config: {
                        location: "another/path/config.json"
                    }
                },
                topLevel: "/absolute/top/level.txt"
            };
            const baseDir = "/root";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                nested: {
                    path: "/root/relative/nested/file.txt",
                    config: {
                        location: "/root/another/path/config.json"
                    }
                },
                topLevel: "/absolute/top/level.txt"
            });
        });

        it("should handle arrays", () => {
            const input = {
                paths: [
                    "relative/path1.txt",
                    "/absolute/path2.txt",
                    { nestedPath: "relative/path3.txt" }
                ]
            };
            const baseDir = "/base";

            const result = makePathsAbsolute(input, baseDir);

            expect(result).toEqual({
                paths: [
                    "/base/relative/path1.txt",
                    "/absolute/path2.txt",
                    { nestedPath: "/base/relative/path3.txt" }
                ]
            });
        });

        it("should handle non-object inputs", () => {
            expect(makePathsAbsolute(null, "/base")).toBeNull();
            expect(makePathsAbsolute(undefined, "/base")).toBeUndefined();
            expect(makePathsAbsolute("simple/path", "/base")).toBe("simple/path");
            expect(makePathsAbsolute(42, "/base")).toBe(42);
        });
    });
});
