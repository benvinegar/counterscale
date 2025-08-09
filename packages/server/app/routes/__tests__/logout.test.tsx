import { describe, test, expect, vi, beforeEach } from "vitest";
import { loader, action } from "../logout";
import * as auth from "~/lib/auth";

// Mock the auth module
vi.mock("~/lib/auth", () => ({
    logout: vi.fn(),
}));

describe("logout route", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("action function", () => {
        test("should call logout with correct parameters", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout", {
                method: "POST",
            });
            const mockContext = {
                cloudflare: {
                    env: {
                        CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                        CF_JWT_SECRET: "test-secret",
                    },
                },
            };

            const result = await action({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
            expect(result).toBe(mockRedirect);
        });

        test("should handle logout errors", async () => {
            const logoutError = new Error("Logout failed");
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockRejectedValue(logoutError);

            const mockRequest = new Request("http://localhost/logout", {
                method: "POST",
            });
            const mockContext = {
                cloudflare: {
                    env: {
                        CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                        CF_JWT_SECRET: "test-secret",
                    },
                },
            };

            await expect(
                action({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                }),
            ).rejects.toThrow("Logout failed");

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
        });

        test("should work with different request methods", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout", {
                method: "DELETE",
            });
            const mockContext = {
                cloudflare: {
                    env: { CF_APP_PASSWORD: "different-password" },
                },
            };

            const result = await action({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
            expect(result).toBe(mockRedirect);
        });
    });

    describe("loader function", () => {
        test("should call logout with correct parameters", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout");
            const mockContext = {
                cloudflare: {
                    env: {
                        CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                        CF_JWT_SECRET: "test-secret",
                    },
                },
            };

            const result = await loader({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
            expect(result).toBe(mockRedirect);
        });

        test("should handle logout errors in loader", async () => {
            const logoutError = new Error("Session cleanup failed");
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockRejectedValue(logoutError);

            const mockRequest = new Request("http://localhost/logout");
            const mockContext = {
                cloudflare: {
                    env: {
                        CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                        CF_JWT_SECRET: "test-secret",
                    },
                },
            };

            await expect(
                loader({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                }),
            ).rejects.toThrow("Session cleanup failed");

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
        });

        test("should work with requests containing cookies", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout", {
                headers: {
                    Cookie: "session=abc123; other=value",
                },
            });
            const mockContext = {
                cloudflare: {
                    env: { CF_APP_PASSWORD: "secure-password" },
                },
            };

            const result = await loader({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            expect(logoutSpy).toHaveBeenCalledWith(
                mockRequest,
                mockContext.cloudflare.env,
            );
            expect(result).toBe(mockRedirect);
        });
    });

    describe("both loader and action", () => {
        test("should behave identically for same inputs", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout");
            const mockContext = {
                cloudflare: {
                    env: {
                        CF_PASSWORD_HASH: "$2b$12$test.hash.value",
                        CF_JWT_SECRET: "test-secret",
                    },
                },
            };

            const loaderResult = await loader({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            const actionResult = await action({
                request: mockRequest,
                context: mockContext,
                params: {},
            });

            expect(loaderResult).toBe(mockRedirect);
            expect(actionResult).toBe(mockRedirect);
            expect(logoutSpy).toHaveBeenCalledTimes(2);
            expect(logoutSpy).toHaveBeenNthCalledWith(
                1,
                mockRequest,
                mockContext.cloudflare.env,
            );
            expect(logoutSpy).toHaveBeenNthCalledWith(
                2,
                mockRequest,
                mockContext.cloudflare.env,
            );
        });

        test("should handle different environment configurations", async () => {
            const mockRedirect = { status: 302, headers: new Headers() };
            const logoutSpy = vi
                .spyOn(auth, "logout")
                .mockResolvedValue(mockRedirect as any);

            const mockRequest = new Request("http://localhost/logout");
            const mockContext1 = {
                cloudflare: {
                    env: { CF_APP_PASSWORD: "password1" },
                },
            };
            const mockContext2 = {
                cloudflare: {
                    env: { CF_APP_PASSWORD: "password2" },
                },
            };

            await loader({
                request: mockRequest,
                context: mockContext1,
                params: {},
            });

            await action({
                request: mockRequest,
                context: mockContext2,
                params: {},
            });

            expect(logoutSpy).toHaveBeenCalledTimes(2);
            expect(logoutSpy).toHaveBeenNthCalledWith(
                1,
                mockRequest,
                mockContext1.cloudflare.env,
            );
            expect(logoutSpy).toHaveBeenNthCalledWith(
                2,
                mockRequest,
                mockContext2.cloudflare.env,
            );
        });
    });
});
