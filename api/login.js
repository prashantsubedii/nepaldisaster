'use strict';
/* POST /api/login  { email, password }
   Server-side credential check. Rate-limited against brute force. On success,
   sets an HttpOnly signed session cookie. Generic errors prevent user
   enumeration. There is NO client-side password — it can't be bypassed. */

const {
  verifyPassword, verifyEmail, signSession, sessionCookie, clientIp, isConfigured
} = require('../lib/auth');
const { cmd, pipeline } = require('../lib/kv');

const MAX_ATTEMPTS = 5;     // per IP
const MAX_GLOBAL = 30;      // across all IPs — stops guessing spread over many addresses
const WINDOW = 15 * 60;     // 15 minutes

/* Returns 'ok', 'limited' or 'unavailable'. Fails CLOSED: if the limiter store
   can't be reached there is no brute-force protection, so login waits instead
   (visitors are unaffected — only the admin sign-in pauses). */
async function checkLimit(ip) {
  try {
    const ipKey = 'rl:login:' + ip;
    const allKey = 'rl:login:all';
    const [n, g] = await pipeline([['INCR', ipKey], ['INCR', allKey]]);
    if (typeof n !== 'number' || typeof g !== 'number') return 'unavailable';
    // First hit in the window starts the 15-minute clock.
    const exp = [];
    if (n === 1) exp.push(['EXPIRE', ipKey, WINDOW]);
    if (g === 1) exp.push(['EXPIRE', allKey, WINDOW]);
    if (exp.length) await pipeline(exp);
    return n <= MAX_ATTEMPTS && g <= MAX_GLOBAL ? 'ok' : 'limited';
  } catch (_) {
    return 'unavailable';
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
  const limit = await checkLimit(ip);
  if (limit === 'limited') {
    res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    return;
  }
  if (limit === 'unavailable') {
    res.status(503).json({ error: 'Sign-in is temporarily unavailable. Try again shortly.' });
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
