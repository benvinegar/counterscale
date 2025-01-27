import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import shell from "shelljs";
import inquirer from "inquirer";

// import { getServerPkgDir } from "../utils.js";

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
            stdout: "test-output",
            code: 0,
        }));

        vi.mocked(inquirer.prompt).mockResolvedValue({
            workerName: "test-worker",
            analyticsDataset: "test-dataset",
        });
    });

    // afterEach(() => {
    //     vi.resetModules();
    // });

    describe("getServerPkgDir", () => {
        it("should find package in node_modules", async () => {
            const { getServerPkgDir } = await import("../utils.js");
            const { existsSync } = await import("node:fs");

            // Mock npm root command to return a specific path
            vi.mocked(shell.exec).mockImplementation(() => ({
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
    });
});
