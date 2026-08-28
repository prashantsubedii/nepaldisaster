'use strict';
/* POST /api/logout — clears the session cookie. */
const { clearCookie } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearCookie());
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
};
