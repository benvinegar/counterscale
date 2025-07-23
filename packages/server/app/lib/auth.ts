import { redirect } from "react-router";
import { createSessionStorage } from "./session";

export async function login(request: Request, password: string, env: Env) {
  if (password !== env.CF_APP_PASSWORD) {
    throw new Error("Invalid password");
  }

  const sessionStorage = createSessionStorage(env.CF_APP_PASSWORD);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  
  session.set("authenticated", true);
  
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request, env: Env) {
  const sessionStorage = createSessionStorage(env.CF_APP_PASSWORD);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export async function requireAuth(request: Request, env: Env) {
  const sessionStorage = createSessionStorage(env.CF_APP_PASSWORD);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  
  if (!session.get("authenticated")) {
    throw redirect("/");
  }
  
  return session;
}

export async function getUser(request: Request, env: Env) {
  const sessionStorage = createSessionStorage(env.CF_APP_PASSWORD);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  
  return session.get("authenticated") ? { authenticated: true } : null;
}