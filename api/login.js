'use strict';
/* POST /api/login  { email, password }
   Server-side credential check. Rate-limited against brute force. On success,
   sets an HttpOnly signed session cookie. Generic errors prevent user
   enumeration. There is NO client-side password — it can't be bypassed. */

const {
  verifyPassword, verifyEmail, signSession, sessionCookie, clientIp, isConfigured
} = require('../lib/auth');
const { cmd } = require('../lib/kv');

const MAX_ATTEMPTS = 5;
const WINDOW = 15 * 60; // 15 minutes

async function underLimit(ip) {
  try {
    const key = 'rl:login:' + ip;
    const n = await cmd(['INCR', key]);
    if (n === 1) await cmd(['EXPIRE', key, WINDOW]);
    return n <= MAX_ATTEMPTS;
  } catch (_) {
    // If the limiter store is unreachable, don't lock the real admin out.
    return true;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!isConfigured()) {
    res.status(503).json({ error: 'Admin panel not configured. Set env vars in Vercel.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').slice(0, 200);
  const password = String(body.password || '').slice(0, 200);

  const ip = clientIp(req);
  if (!(await underLimit(ip))) {
    res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    return;
  }

  // Always run both checks so timing doesn't reveal which half failed.
  const emailOk = verifyEmail(email);
  const passOk = verifyPassword(password);
  if (!emailOk || !passOk) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  try { await cmd(['DEL', 'rl:login:' + ip]); } catch (_) { /* best effort */ }
  res.setHeader('Set-Cookie', sessionCookie(signSession()));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
};
