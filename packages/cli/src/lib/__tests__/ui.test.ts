import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PasswordOptions } from "@clack/prompts";
import { getTitle, getScriptSnippet, getPackageSnippet, promptForPassword } from "../ui.js";

// Mock @clack/prompts
vi.mock("@clack/prompts", () => ({
    isCancel: vi.fn(),
    cancel: vi.fn(),
    password: vi.fn(),
}));

function stripAnsiEscapeCodes(str: string) {
    return str.replace(
        // https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings

        // eslint-disable-next-line no-control-regex
        /\x1b\[[0-9;]*m/g,
        "",
    );
}

// Import mocked functions
import { isCancel } from "@clack/prompts";

describe("UI module", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit called");
        });
    });
    describe("getTitle", () => {
        it("should generate title with version and homepage", () => {
            const version = "1.0.0";
            const homepage = "https://counterscale.dev";
            const title = getTitle(version, homepage);

            expect(title).toContain(version);
            expect(title).toContain(homepage);
        });
    });

    describe("getScriptSnippet", () => {
        it("should generate valid script snippet with deploy URL", () => {
            const deployUrl = "https://example.counterscale.dev";
            const snippet = stripAnsiEscapeCodes(getScriptSnippet(deployUrl));

            expect(snippet).toContain("script");
            expect(snippet).toContain('id="counterscale-script"');
            expect(snippet).toContain(
                'data-site-id="YOUR_UNIQUE_SITE_ID__CHANGE_THIS"',
            );
            expect(snippet).toContain(`${deployUrl}/tracker.js`);
        });
    });

    describe("getPackageSnippet", () => {
        it("should generate valid package snippet with deploy URL and version", () => {
            const deployUrl = "https://example.counterscale.dev";
            const version = "1.0.0";
            const snippet = stripAnsiEscapeCodes(
                getPackageSnippet(deployUrl, version),
            );

            expect(snippet).toContain(`@counterscale/tracker@${version}`);
            expect(snippet).toContain("Counterscale.init");
            expect(snippet).toContain(
                'siteId: "YOUR_UNIQUE_SITE_ID__CHANGE_THIS"',
            );
            expect(snippet).toContain(`reporterUrl: "${deployUrl}/collect"`);
        });
    });

    describe("promptForPassword", () => {
        it("should return valid password", async () => {
            const mockPassword = "mySecurePassword123";
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            const mockPrompts = await import("@clack/prompts");
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue(mockPassword);

            const result = await promptForPassword();
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

            await expect(promptForPassword()).rejects.toThrow(
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

            await expect(promptForPassword()).rejects.toThrow(
                "Password is required",
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

            await promptForPassword();
            expect(mockPrompts.password).toHaveBeenCalled();
        });

        it("should call password prompt with default message", async () => {
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("test-password");

            await promptForPassword();

            expect(mockPrompts.password).toHaveBeenCalledWith({
                message: "Enter a password for authentication:",
                mask: "*",
                validate: expect.any(Function),
            });
        });

        it("should call password prompt with custom message", async () => {
            const customMessage = "Enter your custom password:";
            const mockPrompts = await import("@clack/prompts");
            (isCancel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                false,
            );
            (
                mockPrompts.password as unknown as ReturnType<typeof vi.fn>
            ).mockResolvedValue("test-password");

            await promptForPassword(customMessage);

            expect(mockPrompts.password).toHaveBeenCalledWith({
                message: customMessage,
                mask: "*",
                validate: expect.any(Function),
            });
        });

        it("should accept passwords with 8 or more characters", async () => {
            const testPasswords = [
                "password", // exactly 8 chars
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

                const result = await promptForPassword();
                expect(result).toBe(testPassword);
            }
        });
    });
});
