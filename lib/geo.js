'use strict';
/* City-name normalisation for analytics.
   Vercel's geo lookup returns inconsistent names for the same place — e.g.
   "Bharatpur" (the metropolitan city) and "Chitawan"/"Chitwan" (its district),
   or differing capitalisation. Left unmerged, one place shows up as several
   rows. We canonicalise to a single display name so counts add up correctly.
   Used at WRITE time (api/track.js) to keep the store clean going forward and
   at READ time (api/stats.js) to also merge data already split in the store. */

// Known same-place aliases → canonical display name (keys are lower-cased).
const CITY_ALIASES = {
  'chitwan': 'Bharatpur',
  'chitawan': 'Bharatpur',
  'bharatpur': 'Bharatpur',
  'patan': 'Lalitpur',
  'lalitpur': 'Lalitpur',
  'kathmandu valley': 'Kathmandu',
  'kritipur': 'Kirtipur',
  'kirtipur': 'Kirtipur'
};

function canonCity(name) {
  const raw = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
  if (!raw) return 'Unknown';
  const key = raw.toLowerCase();
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  // Title-case so "kathmandu" and "Kathmandu" fall into the same bucket.
  return raw.replace(/\b\w/g, c => c.toUpperCase());
}

/* Merge an already-sorted [[name,count],...] list by canonical name. */
function mergeCities(rows) {
  const m = new Map();
  (rows || []).forEach(r => {
    const c = canonCity(r[0]);
    m.set(c, (m.get(c) || 0) + (Number(r[1]) || 0));
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

module.exports = { canonCity, mergeCities, CITY_ALIASES };
