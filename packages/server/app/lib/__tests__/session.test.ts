import { describe, test, expect, vi } from "vitest";
import { createSessionStorage } from "../session";
import { createCookieSessionStorage } from "react-router";

vi.mock("react-router", () => ({
  createCookieSessionStorage: vi.fn(),
}));

describe("session", () => {
  describe("createSessionStorage", () => {
    test("should create session storage with correct configuration", () => {
      const mockSessionStorage = { mock: "session-storage" };
      vi.mocked(createCookieSessionStorage).mockReturnValue(mockSessionStorage as any);

      const secret = "test-secret";
      const result = createSessionStorage(secret);

      expect(createCookieSessionStorage).toHaveBeenCalledWith({
        cookie: {
          name: "__counterscale_session",
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
          sameSite: "lax",
          secrets: [secret],
          secure: false,
        },
      });
      expect(result).toBe(mockSessionStorage);
    });

    test("should use provided secret in configuration", () => {
      const secret = "my-custom-secret";
      createSessionStorage(secret);

      expect(createCookieSessionStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          cookie: expect.objectContaining({
            secrets: [secret],
          }),
        })
      );
    });

    test("should configure cookie with security settings", () => {
      createSessionStorage("test-secret");

      expect(createCookieSessionStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          cookie: expect.objectContaining({
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
          }),
        })
      );
    });

    test("should set correct session name and expiration", () => {
      createSessionStorage("test-secret");

      expect(createCookieSessionStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          cookie: expect.objectContaining({
            name: "__counterscale_session",
            maxAge: 2592000, // 30 days in seconds
          }),
        })
      );
    });
  });
});
