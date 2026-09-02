#!/usr/bin/env node
/* =========================================================================
   Refresh the casualty figures and dates baked into every page's <head>
   (title, meta description, Open Graph / Twitter cards, and the JSON-LD
   FAQPage / SpecialAnnouncement / WebPage blocks).

   Those numbers are what Google, Bing and social previews actually show, and
   they cannot be rendered client-side — so they have to be rewritten in the
   HTML whenever the situation figures move. The live page body updates itself
   from assets/live_data.json and the NDRRMA API; this script keeps the crawler-
   facing copy in step with the same baseline.

   Usage:  node tools/refresh_seo_figures.js
           node tools/refresh_seo_figures.js --dry     (report only, write nothing)

   How it works: FIGURES below lists the previous value → current value for each
   headline number, plus the date strings. Every replacement is an exact string
   swap, so nothing is guessed. After a real-world update, edit assets/
   live_data.json and this table together, then run the script.

   The table is rewritten for each update rather than appended to — it describes
   one hop (last published → current), so leaving old rows in place would make
   a second run rewrite numbers that have already moved on.
   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");

/* Longer prose swaps for the JSON-LD answer text and meta descriptions, applied
   before the numeric table so their wording stays coherent. */
const PROSE = [
  [
    "Chitwan has recorded the most bodies recovered (340), followed by Nawalparasi East (228), Nawalparasi West (178), Nuwakot (102), Gorkha (68), Dhading (58), Tanahun (36). The toll continues to rise as search operations widen downstream.",
    "Around 900 bodies have been recovered and the Ministry of Health reports that only about 4% have been formally identified, with DNA testing and facial photographs in use. The last district breakdown published put Chitwan highest (340), followed by Nawalparasi East (228), Nawalparasi West (178), Nuwakot (102), Gorkha (68), Dhading (58) and Tanahun (36); that split lags the national total, which continues to rise as the search widens downstream."
  ],
  [
    "The missing include 639 people linked to hydropower projects, 583 foreign nationals and 83 security personnel.",
    "The missing include 900 workers from 12 hydropower projects (around 500 of them believed trapped in flooded tunnels), 583 foreign nationals from 38 countries, an estimated 300 trade and transport workers, and 85 security personnel."
  ],
  [
    "639 hydropower personnel (~500 believed trapped",
    "900 hydropower personnel across 12 projects (~500 believed trapped"
  ],
  ["267 injured / 2,800+ treated", "1,473 injured / 2,740 treated"],
  ["1,058 confirmed (NDRRMA, 1 Sept, Nepal side)", "1,114 confirmed (NDRRMA, 2 Sept, Nepal side)"],
  ["3,122 individually named in th", "4,248 individually named in th"],
  ["killing 987+ people and leaving more than 3,900 missing", "killing 1,100+ people and leaving more than 3,900 missing"],

  // --- dates -------------------------------------------------------------
  ["2026-09-01", "2026-09-02"],
  ["1 September 2026", "2 September 2026"],
  ["1 Sept 2026", "2 Sept 2026"],
  ["(NDRRMA, 1 Sept)", "(NDRRMA, 2 Sept)"],
  ["1 Sept)", "2 Sept)"],
];

/* Previous value → current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ["1,058 confirmed dead, 3,916 missing, 11,800 rescued", "1,114 confirmed dead, 3,916 missing, 11,814 rescued"],
  ["1,058 dead, 3,916 missing, 11,800 rescued", "1,114 dead, 3,916 missing, 11,814 rescued"],
  ["1,058 dead and 3,916 missing", "1,114 dead and 3,916 missing"],
  ["11,800 rescued by security forces", "11,814 rescued by security forces"],
  ["11,800 rescued by joint security for", "11,814 rescued by joint security for"],
  ["11,800 people have been rescued", "11,814 people have been rescued"],
  ["11,800 people as of", "11,814 people as of"],
  ["1,058 deaths as of", "1,114 deaths as of"],
  ["1,058 confirmed dead", "1,114 confirmed dead"],
  ["11,800 rescued", "11,814 rescued"],
  ["11,800", "11,814"],
  ["1,058", "1,114"],
  ["3,122", "4,248"],
];

function run() {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
  let touched = 0, edits = 0;
  for (const f of files) {
    const p = path.join(ROOT, f);
    const before = fs.readFileSync(p, "utf8");
    let after = before;
    let n = 0;
    for (const [a, b] of PROSE.concat(FIGURES)) {
      if (a === b || !after.includes(a)) continue;
      n += after.split(a).length - 1;
      after = after.split(a).join(b);
    }
    if (after !== before) {
      touched++; edits += n;
      if (!DRY) fs.writeFileSync(p, after, "utf8");
      console.log(`${DRY ? "would update" : "updated"} ${f} (${n} replacements)`);
    }
  }
  console.log(`${DRY ? "dry run: " : ""}${touched} file(s), ${edits} replacement(s)`);
}

run();
