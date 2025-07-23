import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { login, logout, requireAuth, getUser } from "../auth";
import { createSessionStorage } from "../session";

vi.mock("../session");
vi.mock("react-router", () => ({
  redirect: vi.fn((url, options) => ({ url, options })),
}));

const mockSessionStorage = {
  getSession: vi.fn(),
  commitSession: vi.fn(),
  destroySession: vi.fn(),
};

const mockSession = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockEnv = {
  CF_APP_PASSWORD: "test-password",
} as Env;

describe("auth", () => {
  beforeEach(() => {
    vi.mocked(createSessionStorage).mockReturnValue(mockSessionStorage as any);
    mockSessionStorage.getSession.mockResolvedValue(mockSession);
    mockSessionStorage.commitSession.mockResolvedValue("session-cookie");
    mockSessionStorage.destroySession.mockResolvedValue("destroyed-cookie");
    mockSession.get.mockReturnValue(false);
    mockSession.set.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    test("should login successfully with correct password", async () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "existing-cookie" },
      });

      const result = await login(request, "test-password", mockEnv);

      expect(createSessionStorage).toHaveBeenCalledWith("test-password");
      expect(mockSessionStorage.getSession).toHaveBeenCalledWith("existing-cookie");
      expect(mockSession.set).toHaveBeenCalledWith("authenticated", true);
      expect(mockSessionStorage.commitSession).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual({
        url: "/dashboard",
        options: {
          headers: {
            "Set-Cookie": "session-cookie",
          },
        },
      });
    });

    test("should throw error with incorrect password", async () => {
      const request = new Request("http://localhost");

      await expect(login(request, "wrong-password", mockEnv)).rejects.toThrow(
        "Invalid password"
      );
    });

    test("should handle request without cookie header", async () => {
      const request = new Request("http://localhost");

      await login(request, "test-password", mockEnv);

      expect(mockSessionStorage.getSession).toHaveBeenCalledWith(null);
    });
  });

  describe("logout", () => {
    test("should logout successfully", async () => {
      const request = new Request("http://localhost", {
        headers: { Cookie: "session-cookie" },
      });

      const result = await logout(request, mockEnv);

      expect(createSessionStorage).toHaveBeenCalledWith("test-password");
      expect(mockSessionStorage.getSession).toHaveBeenCalledWith("session-cookie");
      expect(mockSessionStorage.destroySession).toHaveBeenCalledWith(mockSession);
      expect(result).toEqual({
        url: "/",
        options: {
          headers: {
            "Set-Cookie": "destroyed-cookie",
          },
        },
      });
    });

    test("should handle request without cookie header", async () => {
      const request = new Request("http://localhost");

      await logout(request, mockEnv);

      expect(mockSessionStorage.getSession).toHaveBeenCalledWith(null);
    });
  });

  describe("requireAuth", () => {
    test("should return session when authenticated", async () => {
      mockSession.get.mockReturnValue(true);
      const request = new Request("http://localhost", {
        headers: { Cookie: "session-cookie" },
      });

      const result = await requireAuth(request, mockEnv);

      expect(createSessionStorage).toHaveBeenCalledWith("test-password");
      expect(mockSessionStorage.getSession).toHaveBeenCalledWith("session-cookie");
      expect(mockSession.get).toHaveBeenCalledWith("authenticated");
      expect(result).toBe(mockSession);
    });

    test("should redirect when not authenticated", async () => {
      mockSession.get.mockReturnValue(false);
      const request = new Request("http://localhost");

      await expect(requireAuth(request, mockEnv)).rejects.toEqual({
        url: "/",
        options: undefined,
      });
    });

    test("should redirect when session has no authenticated value", async () => {
      mockSession.get.mockReturnValue(undefined);
      const request = new Request("http://localhost");

      await expect(requireAuth(request, mockEnv)).rejects.toEqual({
        url: "/",
        options: undefined,
      });
    });
  });

  describe("getUser", () => {
    test("should return user object when authenticated", async () => {
      mockSession.get.mockReturnValue(true);
      const request = new Request("http://localhost", {
        headers: { Cookie: "session-cookie" },
      });

      const result = await getUser(request, mockEnv);

      expect(createSessionStorage).toHaveBeenCalledWith("test-password");
      expect(mockSessionStorage.getSession).toHaveBeenCalledWith("session-cookie");
      expect(mockSession.get).toHaveBeenCalledWith("authenticated");
      expect(result).toEqual({ authenticated: true });
    });

    test("should return null when not authenticated", async () => {
      mockSession.get.mockReturnValue(false);
      const request = new Request("http://localhost");

      const result = await getUser(request, mockEnv);

      expect(result).toBeNull();
    });

    test("should return null when session has no authenticated value", async () => {
      mockSession.get.mockReturnValue(undefined);
      const request = new Request("http://localhost");

      const result = await getUser(request, mockEnv);

      expect(result).toBeNull();
    });
  });
});