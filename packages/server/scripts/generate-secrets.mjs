#!/usr/bin/env node

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { intro, password, note, outro, isCancel, cancel } from "@clack/prompts";

function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

async function generatePasswordHash(password) {
  return await bcrypt.hash(password, 12);
}

async function main() {
  intro('🔐 Counterscale Secret Generator');
  
  const jwtSecret = generateJWTSecret();
  
  const userPassword = await password({
    message: 'Enter password to hash:',
    validate: (value) => {
      if (!value.trim()) {
        return 'Password cannot be empty';
      }
      if (value.trim().length < 12) {
        return 'Password must be 12 characters or more';
      }
    }
  });
  
  if (isCancel(userPassword)) {
    cancel('Operation cancelled');
    process.exit(0);
  }
  
  try {
    const passwordHash = await generatePasswordHash(userPassword);
    
    const output = [
      'Copy these values to your .dev.vars file:',
      '',
      `CF_JWT_SECRET='${jwtSecret}'`,
      `CF_PASSWORD_HASH='${passwordHash}'`
    ].join('\n');
    
    note(output, 'Generated Secrets');
    outro('✅ Secrets generated successfully!');
    
  } catch (error) {
    cancel(`Error generating password hash: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
