import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "react-router";
import {
    shouldProtectRoute,
    isAuthenticated,
    createAuthLoader,
} from "../auth";
import * as authUtils from "../../lib/auth";

// Mock the auth utilities
vi.mock("../../lib/auth", () => ({
    getTokenFromCookies: vi.fn(),
    verifyToken: vi.fn(),
}));

describe("Authentication Middleware", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("shouldProtectRoute", () => {
        it("should not protect public routes", () => {
            expect(shouldProtectRoute("/collect")).toBe(false);
            expect(shouldProtectRoute("/collect/something")).toBe(false);
        });

        it("should not protect login route", () => {
            expect(shouldProtectRoute("/login")).toBe(false);
        });

        it("should protect all other routes", () => {
            expect(shouldProtectRoute("/dashboard")).toBe(true);
            expect(shouldProtectRoute("/resources")).toBe(true);
            expect(shouldProtectRoute("/")).toBe(true);
        });
    });

    describe("isAuthenticated", () => {
        it("should return false if no token is present", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue(null);
            
            const request = new Request("https://example.com");
            const result = await isAuthenticated(request, "secret");
            
            expect(result).toBe(false);
            expect(authUtils.getTokenFromCookies).toHaveBeenCalledWith(request);
            expect(authUtils.verifyToken).not.toHaveBeenCalled();
        });

        it("should verify token if present", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue("test_token");
            vi.mocked(authUtils.verifyToken).mockResolvedValue(true);
            
            const request = new Request("https://example.com");
            const result = await isAuthenticated(request, "secret");
            
            expect(result).toBe(true);
            expect(authUtils.getTokenFromCookies).toHaveBeenCalledWith(request);
            expect(authUtils.verifyToken).toHaveBeenCalledWith("test_token", "secret");
        });

        it("should return false if token verification fails", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue("test_token");
            vi.mocked(authUtils.verifyToken).mockResolvedValue(false);
            
            const request = new Request("https://example.com");
            const result = await isAuthenticated(request, "secret");
            
            expect(result).toBe(false);
        });
    });

    describe("createAuthLoader", () => {
        let mockLoader: any;
        const mockContext = {
            cloudflare: {
                env: {
                    JWT_SECRET: "test_secret",
                },
            },
        };
        
        beforeEach(() => {
            mockLoader = vi.fn().mockReturnValue({ data: "test" });
        });

        it("should pass through for public routes", async () => {
            const authLoader = createAuthLoader(mockLoader);
            
            const args = {
                request: new Request("https://example.com/collect"),
                context: mockContext,
                params: {},
            };
            
            const result = await authLoader(args);
            
            expect(result).toEqual({ data: "test" });
            expect(mockLoader).toHaveBeenCalledWith(args);
            expect(authUtils.getTokenFromCookies).not.toHaveBeenCalled();
        });

        it("should redirect to login for protected routes without authentication", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue(null);
            
            const authLoader = createAuthLoader(mockLoader);
            
            const args = {
                request: new Request("https://example.com/dashboard"),
                context: mockContext,
                params: {},
            };
            
            const result = await authLoader(args);
            
            // Should be a redirect response
            expect(result).toBeInstanceOf(Response);
            expect(result.headers.get("Location")).toBe("/login");
            expect(mockLoader).not.toHaveBeenCalled();
        });

        it("should call original loader for authenticated requests", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue("test_token");
            vi.mocked(authUtils.verifyToken).mockResolvedValue(true);
            
            const authLoader = createAuthLoader(mockLoader);
            
            const args = {
                request: new Request("https://example.com/dashboard"),
                context: mockContext,
                params: {},
            };
            
            const result = await authLoader(args);
            
            expect(result).toEqual({ data: "test" });
            expect(mockLoader).toHaveBeenCalledWith(args);
        });
    });
});
