'use strict';
/* =========================================================================
   Server-side authentication for the admin panel. Zero dependencies (Node
   built-in crypto only). NOTHING secret is hardcoded here — the password hash,
   admin email and session secret all come from environment variables set in
   the Vercel dashboard, so they are never present in the source or in git.

   Env vars required (set in Vercel → Project → Settings → Environment Variables):
       ADMIN_EMAIL          — the login email (identifier)
       ADMIN_PASSWORD_HASH  — "salt:scryptHashHex" produced by scripts/hash-password.mjs
       SESSION_SECRET       — long random string used to sign session cookies
   ========================================================================= */

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || '';
const PW_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const COOKIE = 'admin_session';
const TTL = 60 * 60 * 8; // 8 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s, 'base64');
}

/* Verify a candidate password against the stored scrypt hash, constant-time. */
function verifyPassword(pw) {
  if (!PW_HASH || typeof pw !== 'string' || !pw) return false;
  const idx = PW_HASH.indexOf(':');
  if (idx < 0) return false;
  const salt = PW_HASH.slice(0, idx);
  const hashHex = PW_HASH.slice(idx + 1);
  let stored, derived;
  try {
    stored = Buffer.from(hashHex, 'hex');
    derived = crypto.scryptSync(pw, salt, stored.length || 64);
  } catch (_) { return false; }
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(stored, derived);
}

/* Email is an identifier, not a secret, but must match exactly. */
function verifyEmail(email) {
  if (!ADMIN_EMAIL) return false;
  return typeof email === 'string' && email.trim().toLowerCase() === ADMIN_EMAIL;
}

/* Issue a signed, expiring session token: base64url(payload).base64url(HMAC). */
function signSession() {
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL }));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return payload + '.' + sig;
}

/* Validate a session token: signature + expiry. Constant-time on the signature. */
function verifySession(token) {
  if (!token || !SECRET) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(b64urlDecode(payload).toString('utf8'));
    return !!data.exp && data.exp >= Math.floor(Date.now() / 1000);
  } catch (_) { return false; }
}

function parseCookies(req) {
  const h = (req.headers && req.headers.cookie) || '';
  const out = {};
  h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(token) {
  return COOKIE + '=' + token +
    '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + TTL;
}
function clearCookie() {
  return COOKIE + '=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

function isAuthed(req) {
  const c = parseCookies(req);
  return verifySession(c[COOKIE]);
}

/* Prefer the headers Vercel sets itself over X-Forwarded-For, whose first value
   a client can try to supply. Capped and stripped so it is safe as a KV key. */
function clientIp(req) {
  const h = (req && req.headers) || {};
  const raw = h['x-vercel-forwarded-for'] || h['x-real-ip'] ||
    String(h['x-forwarded-for'] || '').split(',')[0];
  return String(raw || '').trim().replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || 'unknown';
}

/* Boolean: are all required env vars present? Used to show a helpful setup notice. */
function isConfigured() {
  return !!(SECRET && PW_HASH && ADMIN_EMAIL);
}

module.exports = {
  verifyPassword, verifyEmail, signSession, verifySession,
  sessionCookie, clearCookie, isAuthed, clientIp, isConfigured, COOKIE
};
