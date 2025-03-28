import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "react-router";
import * as loginModule from "../login";
import * as logoutModule from "../logout";
import * as authUtils from "../../lib/auth";

// Mock the auth utilities
vi.mock("../../lib/auth", () => ({
    getTokenFromCookies: vi.fn(),
    verifyToken: vi.fn(),
    createToken: vi.fn(),
    createResponseWithAuthCookie: vi.fn(),
    clearAuthCookie: vi.fn(),
}));

describe("Authentication Routes", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("Login Route", () => {
        const mockContext = {
            cloudflare: {
                env: {
                    ADMIN_USERNAME: "foo",
                    ADMIN_PASSWORD: "bar",
                    JWT_SECRET: "test_secret",
                },
            },
        };

        it("should redirect to dashboard if already authenticated", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue("test_token");
            vi.mocked(authUtils.verifyToken).mockResolvedValue(true);
            
            const request = new Request("https://example.com/login");
            const result = await loginModule.loader({ 
                request, 
                context: mockContext,
                params: {} 
            });
            
            expect(result).toBeInstanceOf(Response);
            expect(result.headers.get("Location")).toBe("/dashboard");
        });

        it("should render login page if not authenticated", async () => {
            vi.mocked(authUtils.getTokenFromCookies).mockReturnValue(null);
            
            const request = new Request("https://example.com/login");
            const result = await loginModule.loader({ 
                request, 
                context: mockContext,
                params: {} 
            });
            
            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        it("should authenticate with valid credentials", async () => {
            vi.mocked(authUtils.createToken).mockResolvedValue("new_token");
            // Mock the createResponseWithAuthCookie function
            vi.mocked(authUtils.createResponseWithAuthCookie).mockReturnValue(
                new Response(JSON.stringify({ success: true }), {
                    headers: {
                        "Content-Type": "application/json",
                        "Set-Cookie": "counterscale_session=new_token; HttpOnly; Path=/; SameSite=Strict"
                    }
                })
            );
            
            const formData = new FormData();
            formData.append("username", "foo");
            formData.append("password", "bar");
            
            const request = new Request("https://example.com/login", {
                method: "POST",
                body: formData,
            });
            
            const result = await loginModule.action({ 
                request, 
                context: mockContext,
                params: {} 
            });
            
            expect(result).toBeInstanceOf(Response);
            expect(result.headers.get("Location")).toBe("/dashboard");
            expect(authUtils.createToken).toHaveBeenCalledWith("foo", "test_secret");
        });

        it("should reject invalid credentials", async () => {
            const formData = new FormData();
            formData.append("username", "wrong");
            formData.append("password", "credentials");
            
            const request = new Request("https://example.com/login", {
                method: "POST",
                body: formData,
            });
            
            const result = await loginModule.action({ 
                request, 
                context: mockContext,
                params: {} 
            });
            
            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(401);
            expect(authUtils.createToken).not.toHaveBeenCalled();
        });
    });

    describe("Logout Route", () => {
        it("should clear auth cookie and redirect to login", async () => {
            vi.mocked(authUtils.clearAuthCookie).mockReturnValue(
                new Response(JSON.stringify({ success: true }), {
                    headers: {
                        "Content-Type": "application/json",
                        "Set-Cookie": "counterscale_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0",
                    },
                })
            );
            
            const request = new Request("https://example.com/logout", {
                method: "POST",
            });
            
            const result = await logoutModule.action({ 
                request,
                context: {},
                params: {} 
            });
            
            expect(result).toBeInstanceOf(Response);
            expect(result.headers.get("Location")).toBe("/login");
            expect(authUtils.clearAuthCookie).toHaveBeenCalled();
        });

        it("should redirect to login when accessed directly", async () => {
            const result = await logoutModule.loader();
            
            expect(result).toBeInstanceOf(Response);
            expect(result.headers.get("Location")).toBe("/login");
        });
    });
});
