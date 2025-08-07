// @vitest-environment jsdom
import { test, describe, expect, vi, beforeEach, afterEach } from "vitest";
import "vitest-dom/extend-expect";

import { createRoutesStub } from "react-router";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

import Index, { loader, action } from "../_index";
import * as auth from "~/lib/auth";

// Mock isAuthEnabled to control test behavior
vi.mock("~/lib/auth", async () => {
    const actual = await vi.importActual("~/lib/auth");
    return {
        ...actual,
        isAuthEnabled: vi.fn().mockReturnValue(true)
    };
});

describe("Index route", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("renders index route", async () => {
        // Set isAuthEnabled to true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const RemixStub = createRoutesStub([
            {
                path: "/",
                Component: Index,
                loader: () => ({ user: { authenticated: false }, authEnabled: true }),
            },
        ]);

        const { container } = render(<RemixStub />);

        // Check if component renders at all
        expect(container).toBeInTheDocument();

        // Wait for content to load
        await waitFor(() => {
            expect(
                screen.getByText("Welcome to Counterscale"),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText("Enter your password to access the dashboard"),
        ).toBeInTheDocument();

        expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    test("renders authenticated state", async () => {
        // Set isAuthEnabled to true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const RemixStub = createRoutesStub([
            {
                path: "/",
                Component: Index,
                loader: () => ({ user: { authenticated: true }, authEnabled: true }),
            },
        ]);

        render(<RemixStub />);

        await waitFor(() => {
            expect(
                screen.getByText("Welcome to Counterscale"),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText("Continue to access your analytics dashboard."),
        ).toBeInTheDocument();

        expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: "Go to Dashboard" }),
        ).toHaveAttribute("href", "/dashboard");
    });
});

describe("loader function", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("should return user when authenticated", async () => {
        const mockUser = { authenticated: true };
        const getUserSpy = vi
            .spyOn(auth, "getUser")
            .mockResolvedValue(mockUser);
            
        // Mock isAuthEnabled for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);

        const mockRequest = new Request("http://localhost/");
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

        expect(getUserSpy).toHaveBeenCalledWith(
            mockRequest,
            mockContext.cloudflare.env,
        );
        expect(result).toEqual({ user: mockUser, authEnabled: true });
    });

    test("should return { authenticated: false } user when not authenticated", async () => {
        const getUserSpy = vi
            .spyOn(auth, "getUser")
            .mockResolvedValue({ authenticated: false });
            
        // Mock isAuthEnabled for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);

        const mockRequest = new Request("http://localhost/");
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

        expect(getUserSpy).toHaveBeenCalledWith(
            mockRequest,
            mockContext.cloudflare.env,
        );
        expect(result).toEqual({ user: { authenticated: false }, authEnabled: true });
    });
});

describe("action function", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("should return error when password is missing", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const formData = new FormData();
        const mockRequest = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request;

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

        expect(result).toEqual({ error: "Password is required" });
    });

    test("should return error when password is empty string", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const formData = new FormData();
        formData.set("password", "");

        const mockRequest = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request;

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

        expect(result).toEqual({ error: "Password is required" });
    });

    test("should return error when password is not a string", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const formData = new FormData();
        formData.set("password", "123" as any);
        // Mock formData.get to return a non-string value
        const mockFormData = {
            get: vi.fn().mockReturnValue(123),
        };

        const mockRequest = {
            formData: vi.fn().mockResolvedValue(mockFormData),
        } as unknown as Request;

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

        expect(result).toEqual({ error: "Password is required" });
    });

    test("should call login and return redirect when password is valid", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const mockRedirect = { status: 302, headers: new Headers() };
        const loginSpy = vi
            .spyOn(auth, "login")
            .mockResolvedValue(mockRedirect as any);

        const formData = new FormData();
        formData.set("password", "correct-password");

        const mockRequest = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request;

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

        expect(loginSpy).toHaveBeenCalledWith(
            mockRequest,
            "correct-password",
            mockContext.cloudflare.env,
        );
        expect(result).toBe(mockRedirect);
    });

    test("should return error when login throws an error", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const loginSpy = vi
            .spyOn(auth, "login")
            .mockRejectedValue(new Error("Invalid password"));

        const formData = new FormData();
        formData.set("password", "wrong-password");

        const mockRequest = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request;

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

        expect(loginSpy).toHaveBeenCalledWith(
            mockRequest,
            "wrong-password",
            mockContext.cloudflare.env,
        );
        expect(result).toEqual({ error: "Invalid password" });
    });

    test("should handle login rejection gracefully", async () => {
        // Mock isAuthEnabled to return true for this test
        vi.mocked(auth.isAuthEnabled).mockReturnValue(true);
        
        const loginSpy = vi
            .spyOn(auth, "login")
            .mockRejectedValue("Some other error");

        const formData = new FormData();
        formData.set("password", "any-password");

        const mockRequest = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request;

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

        expect(loginSpy).toHaveBeenCalledWith(
            mockRequest,
            "any-password",
            mockContext.cloudflare.env,
        );
        expect(result).toEqual({ error: "Invalid password" });
    });
});
