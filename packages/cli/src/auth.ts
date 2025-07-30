import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export async function generatePasswordHash(password: string) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

export function generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}
