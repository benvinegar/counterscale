import { describe, it, expect } from "vitest";
import {
    createToken,
    verifyToken,
    getTokenFromCookies,
    createResponseWithAuthCookie,
    clearAuthCookie,
    AUTH_COOKIE_NAME,
} from "../auth";

describe("Authentication Utilities", () => {
    const testUsername = "testuser";
    const testSecret = "test_secret_key";

    describe("JWT Token Management", () => {
        it("should create a valid JWT token", async () => {
            const token = await createToken(testUsername, testSecret);
            
            // Token should be a string with three parts separated by dots
            expect(token).toBeDefined();
            expect(typeof token).toBe("string");
            
            const parts = token.split(".");
            expect(parts.length).toBe(3);
        });

        it("should verify a valid token", async () => {
            const token = await createToken(testUsername, testSecret);
            const isValid = await verifyToken(token, testSecret);
            
            expect(isValid).toBe(true);
        });

        it("should reject an invalid token", async () => {
            const token = "invalid.token.format";
            const isValid = await verifyToken(token, testSecret);
            
            expect(isValid).toBe(false);
        });

        it("should reject a token with wrong secret", async () => {
            const token = await createToken(testUsername, testSecret);
            const isValid = await verifyToken(token, "wrong_secret");
            
            expect(isValid).toBe(false);
        });
    });

    describe("Cookie Management", () => {
        it("should extract token from cookies", () => {
            const request = new Request("https://example.com", {
                headers: {
                    Cookie: `${AUTH_COOKIE_NAME}=test_token; other=value`,
                },
            });
            
            const token = getTokenFromCookies(request);
            expect(token).toBe("test_token");
        });

        it("should return null if no cookie is present", () => {
            const request = new Request("https://example.com");
            const token = getTokenFromCookies(request);
            
            expect(token).toBeNull();
        });

        it("should create response with auth cookie", () => {
            const data = { success: true };
            const token = "test_token";
            
            const response = createResponseWithAuthCookie(data, token);
            
            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("application/json");
            
            const setCookie = response.headers.get("Set-Cookie");
            expect(setCookie).toContain(AUTH_COOKIE_NAME);
            expect(setCookie).toContain(token);
            expect(setCookie).toContain("HttpOnly");
        });

        it("should clear auth cookie", () => {
            const response = clearAuthCookie();
            
            const setCookie = response.headers.get("Set-Cookie");
            expect(setCookie).toContain(AUTH_COOKIE_NAME);
            expect(setCookie).toContain("Max-Age=0");
        });
    });
});
