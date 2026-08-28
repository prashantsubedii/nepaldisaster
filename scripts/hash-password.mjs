#!/usr/bin/env node
/* =========================================================================
   Generate the values you paste into Vercel's Environment Variables.
   The plaintext password is NEVER written to disk or committed — this only
   prints a one-way scrypt hash plus a random session secret.

   Usage:
     node scripts/hash-password.mjs 'your-password-here'

   Then in Vercel → Project → Settings → Environment Variables, set:
     ADMIN_EMAIL          = your login email
     ADMIN_PASSWORD_HASH  = (the "salt:hash" line printed below)
     SESSION_SECRET       = (the random secret printed below)
   ========================================================================= */
import crypto from 'node:crypto';

const pw = process.argv[2];
if (!pw) {
  console.error("Usage: node scripts/hash-password.mjs 'your-password'");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
const sessionSecret = crypto.randomBytes(48).toString('base64url');

console.log('\nPaste these into Vercel → Settings → Environment Variables:\n');
console.log('ADMIN_PASSWORD_HASH=' + salt + ':' + hash);
console.log('SESSION_SECRET=' + sessionSecret);
console.log('\n(Also set ADMIN_EMAIL to your login email.)\n');
