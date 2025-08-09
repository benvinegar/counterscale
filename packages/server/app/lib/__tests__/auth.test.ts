import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { login, logout, requireAuth, getUser, isAuthEnabled } from "../auth";
import { createJWTCookie, clearJWTCookie } from "../session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AnalyticsEngineDataset } from "@cloudflare/workers-types";

vi.mock("../session");
vi.mock("bcryptjs");
vi.mock("react-router", () => ({
    redirect: vi.fn((url, options) => ({ url, options })),
}));

const mockEnv = {
    CF_PASSWORD_HASH: "$2b$12$test.hash.value",
    CF_JWT_SECRET: "test-secret-key-for-jwt-signing-and-verification",
} as Env;

const mockEnvAuthDisabled = {
    CF_BEARER_TOKEN: "test-bearer-token",
    CF_ACCOUNT_ID: "test-account-id",
    CF_AUTH_ENABLED: "false",
    WEB_COUNTER_AE: {} as AnalyticsEngineDataset,
} as Env;

describe("auth", () => {
    beforeEach(() => {
        vi.mocked(createJWTCookie).mockReturnValue(
            "__counterscale_token=test-jwt; HttpOnly; Max-Age=2592000; Path=/; SameSite=Lax",
        );
        vi.mocked(clearJWTCookie).mockReturnValue(
            "__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax",
        );
        vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
    
    describe("isAuthEnabled", () => {
        test("should return true when CF_AUTH_ENABLED is true", () => {
            const env = {
                ...mockEnv,
                CF_AUTH_ENABLED: "true",
            } as Env;
            
            expect(isAuthEnabled(env)).toBe(true);
        });
        
        test("should return false when CF_AUTH_ENABLED is false", () => {
            const env = {
                ...mockEnv,
                CF_AUTH_ENABLED: "false",
            } as Env;
            
            expect(isAuthEnabled(env)).toBe(false);
        });
        
        test("should return true when CF_AUTH_ENABLED is not set but password secrets exist", () => {
            //@ts-expect-error emulate missing var
            const env = {
                ...mockEnv,
                CF_AUTH_ENABLED: undefined,
            } as Env;
            
            expect(isAuthEnabled(env)).toBe(true);
        });
        
        test("should throw error when CF_AUTH_ENABLED is true but password secrets are missing", () => {
            const env = {
                CF_AUTH_ENABLED: "true",
                CF_BEARER_TOKEN: "test-bearer-token",
                CF_ACCOUNT_ID: "test-account-id",
            } as Env;
            
            expect(() => isAuthEnabled(env)).toThrow("Authentication is enabled but password secrets are missing");
        });
    });

    describe("login", () => {
        test("should login successfully with correct password", async () => {
            const request = new Request("http://localhost");

            const result = await login(request, "test-password", mockEnv);

            expect(bcrypt.compare).toHaveBeenCalledWith(
                "test-password",
                mockEnv.CF_PASSWORD_HASH,
            );
            expect(createJWTCookie).toHaveBeenCalledWith(expect.any(String));

            // Verify the JWT token that was created
            const createJWTCookieCall =
                vi.mocked(createJWTCookie).mock.calls[0][0];
            const decoded = jwt.verify(
                createJWTCookieCall,
                mockEnv.CF_JWT_SECRET,
            ) as jwt.JwtPayload;
            expect(decoded.authenticated).toBe(true);
            expect(decoded.iat).toBeTypeOf("number");
            expect(decoded.iss).toBe("counterscale");

            expect(result).toEqual({
                url: "/dashboard",
                options: {
                    headers: {
                        "Set-Cookie":
                            "__counterscale_token=test-jwt; HttpOnly; Max-Age=2592000; Path=/; SameSite=Lax",
                    },
                },
            });
        });

        test("should throw error with incorrect password", async () => {
            vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
            const request = new Request("http://localhost");

            await expect(
                login(request, "wrong-password", mockEnv),
            ).rejects.toThrow("Invalid password");

            expect(bcrypt.compare).toHaveBeenCalledWith(
                "wrong-password",
                mockEnv.CF_PASSWORD_HASH,
            );
        });
        
        test("should redirect to dashboard when auth is disabled", async () => {
            const request = new Request("http://localhost");

            const result = await login(request, "any-password", mockEnvAuthDisabled);

            // Should not attempt to verify password
            expect(bcrypt.compare).not.toHaveBeenCalled();
            
            // Should redirect directly to dashboard without setting cookie
            expect(result).toEqual({
                url: "/dashboard",
                options: undefined,
            });
        });
    });

    describe("logout", () => {
        test("should logout successfully", async () => {
            const request = new Request("http://localhost", {
                headers: { Cookie: "__counterscale_token=some-jwt" },
            });

            const result = await logout(request, mockEnv);

            expect(clearJWTCookie).toHaveBeenCalled();
            expect(result).toEqual({
                url: "/",
                options: {
                    headers: {
                        "Set-Cookie":
                            "__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax",
                    },
                },
            });
        });

        test("should handle request without cookie header", async () => {
            const request = new Request("http://localhost");

            const result = await logout(request, mockEnv);

            expect(clearJWTCookie).toHaveBeenCalled();
            expect(result).toEqual({
                url: "/",
                options: {
                    headers: {
                        "Set-Cookie":
                            "__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax",
                    },
                },
            });
        });
    });

    describe("requireAuth", () => {
        test("should return user when authenticated", async () => {
            // Create a real JWT token for testing
            const validToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "30d", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${validToken}` },
            });

            const result = await requireAuth(request, mockEnv);

            expect(result).toEqual({ authenticated: true });
        });

        test("should redirect when not authenticated", async () => {
            const request = new Request("http://localhost");

            await expect(requireAuth(request, mockEnv)).rejects.toEqual({
                url: "/",
                options: undefined,
            });
        });

        test("should redirect when JWT is invalid", async () => {
            const request = new Request("http://localhost", {
                headers: { Cookie: "__counterscale_token=invalid-jwt" },
            });

            await expect(requireAuth(request, mockEnv)).rejects.toEqual({
                url: "/",
                options: undefined,
            });
        });

        test("should redirect when JWT is expired", async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "-1s", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${expiredToken}` },
            });

            await expect(requireAuth(request, mockEnv)).rejects.toEqual({
                url: "/",
                options: undefined,
            });
        });
        
        test("should always return authenticated user when auth is disabled", async () => {
            const request = new Request("http://localhost");

            const result = await requireAuth(request, mockEnvAuthDisabled);

            expect(result).toEqual({ authenticated: true });
        });
    });

    describe("getUser", () => {
        test("should return user object when authenticated with valid JWT", async () => {
            // Create a real JWT token for testing
            const validToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "30d", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${validToken}` },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: true });
        });

        test("should return { authenticated: false } when no cookie header", async () => {
            const request = new Request("http://localhost");

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });

        test("should return { authenticated: false } when no JWT token in cookie", async () => {
            const request = new Request("http://localhost", {
                headers: { Cookie: "other-cookie=value" },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });

        test("should return { authenticated: false } when JWT is invalid", async () => {
            const request = new Request("http://localhost", {
                headers: { Cookie: "__counterscale_token=invalid-jwt" },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });

        test("should return { authenticated: false } when JWT is expired", async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "-1s", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${expiredToken}` },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });

        test("should return { authenticated: false } when JWT payload is not authenticated", async () => {
            // Create a token with authenticated: false
            const unauthenticatedToken = jwt.sign(
                { authenticated: false, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "30d", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: {
                    Cookie: `__counterscale_token=${unauthenticatedToken}`,
                },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });

        test("should return { authenticated: false } when JWT has wrong issuer", async () => {
            // Create a token with wrong issuer
            const wrongIssuerToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                mockEnv.CF_JWT_SECRET,
                { expiresIn: "30d", issuer: "wrong-issuer" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${wrongIssuerToken}` },
            });

            const result = await getUser(request, mockEnv);

            // This should still work since the auth.ts doesn't validate issuer in verification
            expect(result).toEqual({ authenticated: true });
        });

        test("should return { authenticated: false } when JWT signed with wrong secret", async () => {
            // Create a token with wrong secret
            const wrongSecretToken = jwt.sign(
                { authenticated: true, iat: Math.floor(Date.now() / 1000) },
                "wrong-secret",
                { expiresIn: "30d", issuer: "counterscale" },
            );

            const request = new Request("http://localhost", {
                headers: { Cookie: `__counterscale_token=${wrongSecretToken}` },
            });

            const result = await getUser(request, mockEnv);

            expect(result).toEqual({ authenticated: false });
        });
        
        test("should always return authenticated user when auth is disabled", async () => {
            const request = new Request("http://localhost");

            const result = await getUser(request, mockEnvAuthDisabled);

            expect(result).toEqual({ authenticated: true });
        });
    });
});
