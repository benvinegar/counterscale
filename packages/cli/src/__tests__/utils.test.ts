import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import inquirer from "inquirer";
import { existsSync } from "node:fs";
import { getServerPkgDir } from "../utils.js";
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
    /*
    describe("makePathsAbsolute", () => {
        it("should convert relative paths to absolute", async () => {
            const { makePathsAbsolute } = await import("../index.js");

            const testObj = {
                path1: "relative/path",
                path2: "/absolute/path",
                nested: {
                    path3: "another/relative/path",
                },
            };

            // Mock SERVER_PKG_DIR
            vi.mock("../index", async () => {
                const actual = await vi.importActual("../index");
                return {
                    ...actual,
                    SERVER_PKG_DIR: "/test/server/pkg/dir",
                };
            });

            makePathsAbsolute(testObj);

            // Check that relative paths were converted to absolute using SERVER_PKG_DIR
            expect(testObj.path1).toBe(
                path.join("/test/server/pkg/dir", "relative/path"),
            );
            expect(testObj.path2).toBe("/absolute/path"); // absolute path should remain unchanged
            expect(testObj.nested.path3).toBe(
                path.join("/test/server/pkg/dir", "another/relative/path"),
            );
        });
    });*/
});
