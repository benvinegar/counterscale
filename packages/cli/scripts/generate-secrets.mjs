#!/usr/bin/env node

import { intro, password, note, outro, isCancel, cancel } from "@clack/prompts";
import { generateCryptoSecret, generatePasswordHash } from "../dist/auth.js";

async function main() {
  intro('🔐 Counterscale Development Secret Generator');
  
  const jwtSecret = generateCryptoSecret();
;
  
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
    const passwordHash = await generatePasswordHash(userPassword, jwtSecret);
    
    const output = [
      'Copy these values to your .dev.vars file:',
      '',
      `CF_CRYPTO_SECRET='${jwtSecret}'`,
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

