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

   Current hop: 5 September 2026 -> 6 September 2026.

   NOTE: the casualty figures did NOT move. No new national toll was published
   on 6 September — NDRRMA's 1,344 and Nepal Police's 08:00 count of 1,342 on
   5 September are still the latest official numbers, and the crawler copy must
   keep saying "as of 5 September 2026" rather than being re-dated to today.
   Re-dating figures that have not been re-published is exactly how a site
   starts lying quietly.

   What moved: the road situation (a 252 m temporary track opened at
   Krishnabhir, the Parewabhir section closed for the working day, and the
   Tribhuvan Highway / Kanti Lokpath now carrying diverted traffic), the damage
   assessment (the Rapid Damage and Needs Assessment puts loss and damage near
   Rs 400 billion against NDRRMA's Rs 387.54 billion, with a PDNA panel due to
   report in six weeks), and dateModified/datePosted.

   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");

/* Longer prose swaps for the JSON-LD answer text and meta descriptions, applied
   before the numeric table so their wording stays coherent. */
const PROSE = [
  /* The homepage SpecialAnnouncement one-liner about the road. */
  [
    "The Prithvi Highway is cut at Krishnabhir in Dhading.",
    "The Prithvi Highway is closed at Parewabhir (Gajuri-2, Dhading) from 6am to 6pm on 6 September; at Krishnabhir a 252-metre temporary track opened but carries construction plant only."
  ],
  /* The FAQ answer people actually search for. */
  [
    "The Prithvi Highway\u2019s Mugling\u2013Kathmandu section is cut at Krishnabhir in Benighat Rorang, Dhading, where the road subsided after the Trishuli eroded its base. The Betrawati\u2013Rasuwagadhi road was destroyed by the flood. Night bans apply on the BP Highway (6pm\u20134am) and Kanti Lokpath (5pm\u20135am). See the Highway Updates page for the live list.",
    "The Prithvi Highway\u2019s Mugling\u2013Kathmandu section is still cut at Krishnabhir in Benighat Rorang, Dhading. A 252-metre temporary track opened there on 6 September but carries construction plant only, and the Department of Roads puts normal traffic about a week away. The Parewabhir section in Gajuri-2 is closed to all but ambulances and hearses from 6am to 6pm on 6 September for repairs. Large buses and freight entering Kathmandu must use the Tribhuvan Highway and Hetauda-bound vehicles the Kanti Lokpath; vehicles under 14 seats may enter via Bhimphedi, Kulekhani, Sisneri or Dakshinkali. The Betrawati\u2013Rasuwagadhi road was destroyed by the flood. Night bans apply on the BP Highway (6pm\u20134am) and Kanti Lokpath (5pm\u20135am). See the Highway Updates page for the live list."
  ],
  /* Damage: NDRRMA's estimate stands, the RDNA total is added beside it. */
  [
    "387.54 billion ($2.56B, NDRRMA, 4 Sept)",
    "387.54 billion ($2.56B, NDRRMA, 4 Sept); the Rapid Damage and Needs Assessment puts total loss and damage near Rs 400 billion"
  ],
];

/* Previous value \u2192 current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ['"dateModified":"2026-09-05"', '"dateModified":"2026-09-06"'],
  ['"datePosted":"2026-09-05T13:20:00+05:45"', '"datePosted":"2026-09-06T10:30:00+05:45"'],
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
