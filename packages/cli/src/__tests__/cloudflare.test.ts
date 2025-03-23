import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CloudflareClient } from "../cloudflare.js";
import { ProcessOutput } from "zx";
import path from "path";
import { homedir } from "node:os";

// Mock the entire zx module
vi.mock("zx", async (importOriginal) => {
    const actual = await importOriginal<typeof import("zx")>();
    return {
        ...actual,
        $: vi.fn(),
    };
});

// Import and spy on the mocked function
const { $ } = await import("zx");

describe("CloudflareClient", () => {
    let client: CloudflareClient;
    const mockConfigPath = "/mock/path/wrangler.json";

    beforeEach(() => {
        vi.clearAllMocks();
        client = new CloudflareClient(mockConfigPath);
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("constructor", () => {
        it("should use default config path when not provided", () => {
            const defaultClient = new CloudflareClient();
            expect(defaultClient["configPath"]).toBe(
                path.join(homedir(), ".counterscale", "wrangler.json"),
            );
        });

        it("should use provided config path", () => {
            expect(client["configPath"]).toBe(mockConfigPath);
        });
    });

    describe("getAccountId", () => {
        it("should extract account ID from whoami command", async () => {
            const mockAccountId = "1234567890abcdef1234567890abcdef";

            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: `random content ${mockAccountId} \nmore random content`,
                    stderr: "",
                    exitCode: 0,
                });
            });

            const result = await client.getAccountId();
            expect(result).toBe(mockAccountId);
            expect($).toHaveBeenCalledWith({ quiet: true });
        });

        it("should return null if account ID not found", async () => {
            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: "No account ID here",
                    stderr: "",
                    exitCode: 0,
                });
            });

            const result = await client.getAccountId();
            expect(result).toBeNull();
        });

        it("should handle command errors", async () => {
            vi.mocked($).mockImplementation(() => {
                return () => {
                    throw new ProcessOutput(
                        1, // exit code
                        null, // signal
                        "Command failed", // stdout
                        "", // stderr
                        "Command failed", // combined?
                        "",
                        0, // duration
                    );
                };
            });

            await expect(client.getAccountId()).rejects.toThrow(
                "Command failed",
            );
        });
    });

    describe("getCloudflareSecrets", () => {
        it("should parse secrets list correctly", async () => {
            const mockSecrets = [
                { name: "SECRET1", type: "string" },
                { name: "SECRET2", type: "string" },
            ];

            vi.mocked($).mockImplementation(() => {
                return {
                    stdout: JSON.stringify(mockSecrets),
                    stderr: "",
                    exitCode: 0,
                };
            });

            const result = await client.getCloudflareSecrets();
            expect(result).toEqual({
                SECRET1: "string",
                SECRET2: "string",
            });
        });

        it("should return empty object when worker not created", async () => {
            vi.mocked($).mockImplementation(() => {
                throw "other content \n[code: 10007] Worker not found";
            });

            const result = await client.getCloudflareSecrets();
            expect(result).toEqual({});
        });

        it("should throw on other errors", async () => {
            vi.mocked($).mockImplementation(() => {
                throw "Unknown error";
            });

            await expect(client.getCloudflareSecrets()).rejects.toThrow();
        });
    });

    describe("setCloudflareSecrets", () => {
        it("should set all secrets successfully", async () => {
            vi.mocked($).mockImplementation(() => {
                return {
                    stdout: "Secret successfully created/updated",
                    stderr: "",
                    exitCode: 0,
                };
            });

            const result = await client.setCloudflareSecrets({
                SECRET1: "value1",
                SECRET2: "value2",
            });
            expect(result).toBe(true);
            expect($).toHaveBeenCalledTimes(2);
        });

        it("should return false if any secret fails to set", async () => {
            let callCount = 0;

            vi.mocked($).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {
                        stdout: "Success",
                        stderr: "",
                        exitCode: 0,
                    };
                } else {
                    throw new Error("Failed to set secret");
                }
            });

            const result = await client.setCloudflareSecrets({
                SECRET1: "value1",
                SECRET2: "value2",
            });
            expect(result).toBe(false);
        });
    });

    describe("deploy", () => {
        it("should extract worker URL from deploy output", async () => {
            vi.mocked($).mockImplementation(() => {
                return async function* () {
                    yield "Worker deployed to test-worker.test-account.workers.dev";
                };
            });

            const result = await client.deploy(false, "0.0.1");
            expect(result).toBe("https://test-worker.test-account.workers.dev");
        });

        it("should return <unknown> if URL not found in output", async () => {
            vi.mocked($).mockImplementation(() => {
                return async function* () {
                    yield "Deployment successful but no URL found";
                };
            });

            const result = await client.deploy(false, "0.0.1");
            expect(result).toBe("<unknown>");
        });

        it("should throw on deployment error", async () => {
            vi.mocked($).mockImplementation(() => {
                throw new Error("Deployment failed");
            });

            await expect(client.deploy(false, "0.0.1")).rejects.toThrow(
                "Deployment failed",
            );
        });
    });
});
