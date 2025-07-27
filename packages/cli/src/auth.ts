import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export async function generatePasswordHash(password:string, secret:string) {
  // Create a consistent salt from the secret
  const hash = crypto.createHash('sha256').update(secret).digest();
  const saltBase64 = hash.subarray(0, 16).toString('base64').replace(/[+/=]/g, (c) =>
    c === '+' ? '.' : c === '/' ? '/' : ''
  ).substring(0, 22);

  const salt = `$2b$12$${saltBase64}`;
  return await bcrypt.hash(password, salt);
}

export function generateCryptoSecret() {
    return crypto.randomBytes(64).toString('hex');
}
