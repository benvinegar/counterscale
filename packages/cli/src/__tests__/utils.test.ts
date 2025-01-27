import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import shell from "shelljs";
import inquirer from "inquirer";

import { getServerPkgDir } from "../utils.js";

import { existsSync } from "node:fs";

// Mock external dependencies
vi.mock("shelljs", () => ({
    default: {
        exec: vi.fn(() => ({ stdout: "", code: 0 })),
        mkdir: vi.fn(),
        cp: vi.fn(),
        test: vi.fn(),
    },
}));

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

        // Update shell.exec mock
        const mockShellExec = vi.mocked(shell.exec);
        mockShellExec.mockImplementation(() => ({
            // @ts-expect-error dont mock entire exec return value
            stdout: "test-output",
            code: 0,
        }));

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
            const { existsSync } = await import("node:fs");

            // Mock npm root command to return a specific path
            vi.mocked(shell.exec).mockImplementation(() => ({
                // @ts-expect-error dont mock entire exec return value
                stdout: "/test/path/node_modules\n",
                code: 0,
            }));

            // Mock existsSync to return true only for the node_modules path
            const expectedPath = path.join(
                "/test/path/node_modules",
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
            // Mock npm root command
            vi.mocked(shell.exec).mockImplementation(() => ({
                // @ts-expect-error dont mock entire exec return value
                stdout: "/test/path/node_modules\n",
                code: 0,
            }));

            // Mock existsSync to return false for node_modules but true for monorepo path
            vi.mocked(existsSync).mockImplementation((p) =>
                p.toString().includes("packages/server"),
            );

            const result = getServerPkgDir();
            expect(result).toMatch(/packages\/server$/);
        });

        it("should throw if package not found", async () => {
            // Mock both paths to not exist
            vi.mocked(existsSync).mockReturnValue(false);
            vi.mocked(shell.exec).mockImplementation(() => ({
                // @ts-expect-error dont mock entire exec return value
                stdout: "/test/path/node_modules\n",
                code: 0,
            }));

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
