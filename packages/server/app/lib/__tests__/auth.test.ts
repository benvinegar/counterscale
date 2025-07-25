import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { login, logout, requireAuth, getUser } from "../auth";
import { createJWTCookie, clearJWTCookie } from "../session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

vi.mock("../session");
vi.mock("bcryptjs");
vi.mock("jsonwebtoken");
vi.mock("react-router", () => ({
  redirect: vi.fn((url, options) => ({ url, options })),
}));

const mockEnv = {
  CF_PASSWORD_HASH: "$2b$12$test.hash.value",
  CF_JWT_SECRET: "test-jwt-secret",
} as Env;

describe("auth", () => {
  beforeEach(() => {
    vi.mocked(createJWTCookie).mockReturnValue("__counterscale_token=test-jwt; HttpOnly; Max-Age=2592000; Path=/; SameSite=Lax");
    vi.mocked(clearJWTCookie).mockReturnValue("__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax");
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
    vi.mocked(jwt.sign).mockReturnValue("test-jwt-token" as any);
    vi.mocked(jwt.verify).mockReturnValue({ authenticated: true, iat: Math.floor(Date.now() / 1000) } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    test("should login successfully with correct password", async () => {
      const request = new Request("http://localhost");

      const result = await login(request, "test-password", mockEnv);

      expect(bcrypt.compare).toHaveBeenCalledWith("test-password", mockEnv.CF_PASSWORD_HASH);
      expect(jwt.sign).toHaveBeenCalledWith(
        { authenticated: true, iat: expect.any(Number) },
        mockEnv.CF_JWT_SECRET,
        { expiresIn: '30d', issuer: 'counterscale' }
      );
      expect(createJWTCookie).toHaveBeenCalledWith("test-jwt-token");
      expect(result).toEqual({
        url: "/dashboard",
        options: {
          headers: {
            "Set-Cookie": "__counterscale_token=test-jwt; HttpOnly; Max-Age=2592000; Path=/; SameSite=Lax",
          },
        },
      });
    });

    test("should throw error with incorrect password", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
      const request = new Request("http://localhost");

      await expect(login(request, "wrong-password", mockEnv)).rejects.toThrow(
        "Invalid password"
      );
      
      expect(bcrypt.compare).toHaveBeenCalledWith("wrong-password", mockEnv.CF_PASSWORD_HASH);
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
            "Set-Cookie": "__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax",
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
            "Set-Cookie": "__counterscale_token=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax",
          },
        },
      });
    });
  });

  describe("requireAuth", () => {
    test("should return user when authenticated", async () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "__counterscale_token=valid-jwt" },
      });

      const result = await requireAuth(request, mockEnv);

      expect(jwt.verify).toHaveBeenCalledWith("valid-jwt", mockEnv.CF_JWT_SECRET);
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
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error("Invalid token");
      });
      
      const request = new Request("http://localhost", {
        headers: { Cookie: "__counterscale_token=invalid-jwt" },
      });

      await expect(requireAuth(request, mockEnv)).rejects.toEqual({
        url: "/",
        options: undefined,
      });
    });
  });

  describe("getUser", () => {
    test("should return user object when authenticated with valid JWT", async () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "__counterscale_token=valid-jwt" },
      });

      const result = await getUser(request, mockEnv);

      expect(jwt.verify).toHaveBeenCalledWith("valid-jwt", mockEnv.CF_JWT_SECRET);
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
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error("Invalid token");
      });
      
      const request = new Request("http://localhost", {
        headers: { Cookie: "__counterscale_token=invalid-jwt" },
      });

      const result = await getUser(request, mockEnv);

      expect(result).toEqual({ authenticated: false });
    });

    test("should return { authenticated: false } when JWT payload is not authenticated", async () => {
      vi.mocked(jwt.verify).mockReturnValue({ authenticated: false, iat: Math.floor(Date.now() / 1000) } as any);
      
      const request = new Request("http://localhost", {
        headers: { Cookie: "__counterscale_token=valid-jwt" },
      });

      const result = await getUser(request, mockEnv);

      expect(result).toEqual({ authenticated: false });
    });
  });
});