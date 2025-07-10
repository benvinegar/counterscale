import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CloudflareClient, verifyToken } from "../cloudflare.js";
import { ProcessOutput } from "zx";
import path from "path";
import { homedir } from "node:os";
import fetch from "node-fetch";

// Mock the entire zx module
vi.mock("zx", async (importOriginal:any) => {
    const actual = await importOriginal<typeof import("zx")>();
    return {
        ...actual,
        $: vi.fn(),
    };
});

// Mock node-fetch
vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));

// Import and spy on the mocked function
const { $ } = await import("zx");
const mockedFetch = vi.mocked(fetch);

describe("verifyToken", () => {
    const validToken = 'test-valid-token';
    const mockSuccessResponse = {
            success: true,
            result: {
                status: ['account:read', 'workers:write', 'workers_scripts:edit'],
                // ... other properties
            }
        };

        beforeEach(() => {
            vi.clearAllMocks();
            mockedFetch.mockClear();
        });

        it("should verify a valid token with all required permissions", async () => {

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue(mockSuccessResponse),
            };
            mockedFetch.mockResolvedValue(mockResponse as any);


            await expect(client.verifyToken(validToken)).resolves.toEqual(mockSuccessResponse.result);


            expect(mockedFetch).toHaveBeenCalledWith(
                'https://api.cloudflare.com/client/v4/user/tokens/verify',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${validToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        });

        it("should throw an error for invalid token", async () => {

            const errorResponse = {
                success: false,
                errors: [{ message: 'Invalid API token' }]
            };
            const mockResponse = {
                ok: false,
                json: vi.fn().mockResolvedValue(errorResponse),
            };
            mockedFetch.mockResolvedValue(mockResponse as any);


            await expect(client.verifyToken('invalid-token'))
                .rejects
                .toThrow('Invalid Cloudflare API token');
        });

        it("should throw an error for missing required permissions", async () => {

            const missingPermsResponse = {
                ...mockSuccessResponse,
                result: {
                    status: ['account:read'], 
                }
            };
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue(missingPermsResponse),
            };
            mockedFetch.mockResolvedValue(mockResponse as any);


            await expect(client.verifyToken(validToken))
                .rejects
                .toThrow('Missing required permissions: workers:write, workers_scripts:edit');
        });

        it("should handle network errors", async () => {

            const error = new Error('Network error');
            mockedFetch.mockRejectedValue(error);


            await expect(client.verifyToken(validToken))
                .rejects
                .toThrow('Failed to verify Cloudflare token: Network error');
        });
    });
});

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

    describe("verifyToken", () => {
        it("should delegate to the standalone verifyToken function", async () => {
            const mockResult = { status: ['account:read', 'workers:write', 'workers_scripts:edit'] };
            vi.spyOn(require('../cloudflare'), 'verifyToken').mockResolvedValue(mockResult);

            await expect(client.verifyToken('test-token')).resolves.toBeUndefined();
            expect(require('../cloudflare').verifyToken).toHaveBeenCalledWith('test-token');
        });
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

    describe("getAccounts", () => {
        it("should parse multiple accounts from table format", async () => {
            const mockOutput = `
Getting User settings...
ℹ️  The API Token is read from the CLOUDFLARE_API_TOKEN in your environment.
👋 You are logged in with an API Token. Unable to retrieve email for this user. Are you missing the User->User Details->Read permission?
┌─────────────┬──────────────────────────────────┐
│ Account Name│ Account ID                       │
├─────────────┼──────────────────────────────────┤
│ Account 1   │ 1234567890abcdef1234567890abcdef │
│ Account 2   │ abcdef1234567890abcdef1234567890 │
└─────────────┴──────────────────────────────────┘
`;

            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: mockOutput,
                    stderr: "",
                    exitCode: 0,
                });
            });

            const result = await client.getAccounts();
            expect(result).toEqual([
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
                { id: "abcdef1234567890abcdef1234567890", name: "Account 2" },
            ]);
        });

        it("should parse single account from table format", async () => {
            const mockOutput = `
Getting User settings...
ℹ️  The API Token is read from the CLOUDFLARE_API_TOKEN in your environment.
👋 You are logged in with an API Token. Unable to retrieve email for this user. Are you missing the User->User Details->Read permission?
┌─────────────┬──────────────────────────────────┐
│ Account Name│ Account ID                       │
├─────────────┼──────────────────────────────────┤
│ Account 1   │ 1234567890abcdef1234567890abcdef │
└─────────────┴──────────────────────────────────┘
`;

            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: mockOutput,
                    stderr: "",
                    exitCode: 0,
                });
            });

            const result = await client.getAccounts();
            expect(result).toEqual([
                { id: "1234567890abcdef1234567890abcdef", name: "Account 1" },
            ]);
        });

        it("should fall back to getAccountId when table parsing fails", async () => {
            const mockOutput = "Invalid output format";
            const mockAccountId = "1234567890abcdef1234567890abcdef";

            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: mockOutput,
                    stderr: "",
                    exitCode: 0,
                });
            });

            // Mock getAccountId to return a fallback account
            vi.spyOn(client, "getAccountId").mockResolvedValue(mockAccountId);

            const result = await client.getAccounts();
            expect(result).toEqual([
                { id: mockAccountId, name: `Account ${mockAccountId.slice(-6)}` },
            ]);
        });

        it("should return empty array when no accounts found", async () => {
            const mockOutput = "No accounts found";

            vi.mocked($).mockImplementation(() => {
                return () => ({
                    stdout: mockOutput,
                    stderr: "",
                    exitCode: 0,
                });
            });

            // Mock getAccountId to return null
            vi.spyOn(client, "getAccountId").mockResolvedValue(null);

            const result = await client.getAccounts();
            expect(result).toEqual([]);
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

            await expect(client.getAccounts()).rejects.toThrow("Command failed");
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
