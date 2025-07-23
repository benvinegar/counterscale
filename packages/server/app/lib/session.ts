import { createCookieSessionStorage } from "react-router";

export function createSessionStorage(secret: string) {
  return createCookieSessionStorage({
    cookie: {
      name: "__counterscale_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: true,
    },
  });
}