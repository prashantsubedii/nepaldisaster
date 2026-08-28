'use strict';
/* =========================================================================
   Minimal Upstash Redis (Vercel KV) REST client — zero dependencies.
   Uses global fetch (Node 18+). Credentials come from environment variables
   injected by the Vercel KV / Upstash integration:
       KV_REST_API_URL   — e.g. https://xxxx.upstash.io
       KV_REST_API_TOKEN — bearer token
   These are NEVER hardcoded and NEVER committed to git.
   ========================================================================= */

const API_URL = process.env.KV_REST_API_URL || '';
const API_TOKEN = process.env.KV_REST_API_TOKEN || '';

function _headers() {
  return {
    Authorization: 'Bearer ' + API_TOKEN,
    'Content-Type': 'application/json'
  };
}

/* Run a single Redis command, e.g. cmd(['INCR','key']). Returns .result. */
async function cmd(args) {
  if (!API_URL || !API_TOKEN) throw new Error('KV not configured');
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: _headers(),
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error('KV error ' + r.status);
  const j = await r.json();
  return j.result;
}

/* Run a pipeline of commands atomically-ish, e.g. pipeline([['INCR','a'],['GET','a']]). */
async function pipeline(cmds) {
  if (!API_URL || !API_TOKEN) throw new Error('KV not configured');
  const r = await fetch(API_URL + '/pipeline', {
    method: 'POST',
    headers: _headers(),
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('KV error ' + r.status);
  const j = await r.json();
  return Array.isArray(j) ? j.map(x => x.result) : [];
}

module.exports = { cmd, pipeline };
