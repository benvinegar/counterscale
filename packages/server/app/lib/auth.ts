import { redirect } from "react-router";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createJWTCookie, clearJWTCookie } from "./session";
import { User } from "./types";

export async function login(_request: Request, password: string, env: Env) {
  const isValidPassword = await bcrypt.compare(password, env.CF_PASSWORD_HASH);
  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign(
    { 
      authenticated: true,
      iat: Math.floor(Date.now() / 1000),
    },
    env.CF_JWT_SECRET,
    { 
      expiresIn: '30d',
      issuer: 'counterscale'
    }
  );
  
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": createJWTCookie(token),
    },
  });
}

export async function logout(_request: Request, _env: Env) {
  return redirect("/", {
    headers: {
      "Set-Cookie": clearJWTCookie(),
    },
  });
}

export async function requireAuth(request: Request, env: Env) {
  const user = await getUser(request, env);
  
  if (!user.authenticated) {
    throw redirect("/");
  }
  
  return user;
}

export async function getUser(request: Request, env: Env): Promise<User> {
  try {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      return { authenticated: false };
    }

    // Extract JWT from cookie
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['__counterscale_token'];
    if (!token) {
      return { authenticated: false };
    }

    const decoded = jwt.verify(token, env.CF_JWT_SECRET) as jwt.JwtPayload;
    
    if (decoded.authenticated) {
      return { authenticated: true };
    }
    
    return { authenticated: false };
  } catch {
    // JWT verification failed
    return { authenticated: false };
  }
}
