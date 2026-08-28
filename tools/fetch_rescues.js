#!/usr/bin/env node
/* =========================================================================
   Refresh assets/rescues.json from the official NDRRMA rescue registry.
   The NDRRMA API does not send CORS headers, so a browser on our domain
   cannot read it directly. This script fetches it server-side (no CORS) and
   writes a trimmed snapshot our static site can load same-origin.

   Run any time to update:  node tools/fetch_rescues.js
   Source: https://ndrrma.gov.np/np/rescue
   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const BASE = "https://ndrrma.gov.np/api/v1/rescues";
const OUT = path.join(__dirname, "..", "assets", "rescues.json");

async function getJSON(url){
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if(!r.ok) throw new Error(url + " -> " + r.status);
  return r.json();
}

(async () => {
  const counts = await getJSON(BASE + "/status-counts/?limit=-1");
  const raw = await getJSON(BASE + "/rescued-persons/?limit=-1");
  const list = raw.results || raw;

  // Keep only the fields the public portal shows — no coordinates, no internals.
  const persons = list.map(p => ({
    name: p.name || "",
    name_ne: p.name_ne || "",
    age: (p.age === 0 || p.age) ? p.age : "",
    gender: p.gender || "",
    nationality: p.nationality || "",
    location: (p.rescued_location && p.rescued_location.title) || "",
    location_ne: (p.rescued_location && p.rescued_location.title_ne) || "",
    date: p.rescued_date || "",
    status: (p.status && p.status.title) || "",
    status_ne: (p.status && p.status.title_ne) || ""
  }));

  const snapshot = {
    source: "https://ndrrma.gov.np/np/rescue",
    source_label: "NDRRMA — National Disaster Portal",
    fetched_at: new Date().toISOString(),
    total: counts.total_count,
    nepali: counts.nepali_count,
    foreign: counts.foreign_count,
    status_counts: (counts.status_counts || []).map(s => ({
      title: s.title, title_ne: s.title_ne, count: s.count
    })),
    persons
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 0));
  console.log("Wrote " + OUT);
  console.log("total=" + snapshot.total + " nepali=" + snapshot.nepali +
              " foreign=" + snapshot.foreign + " persons=" + persons.length);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
