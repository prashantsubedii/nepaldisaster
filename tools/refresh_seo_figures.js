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

   Current hop: 6 September 2026 -> 7 September 2026.

   NOTE: the casualty figures STILL did not move. No new national toll has been
   published since 5 September — NDRRMA's 1,344 and Nepal Police's 08:00 count
   of 1,342 remain the latest official numbers, and the crawler copy must keep
   saying "as of 5 September 2026" rather than being re-dated to today.
   Re-dating figures that have not been re-published is exactly how a site
   starts lying quietly.

   What moved on 7 September: the daytime closure at Parewabhir was a per-day
   order (5 and 6 Sept) and there is no published order for today, so the copy
   no longer asserts one; the PM Disaster Relief Fund passed Rs 10 billion on
   6 September; and dateModified/datePosted.

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
    "The Prithvi Highway is closed at Parewabhir (Gajuri-2, Dhading) from 6am to 6pm on 6 September; at Krishnabhir a 252-metre temporary track opened but carries construction plant only.",
    "The Prithvi Highway is still cut at Krishnabhir in Dhading, where a 252-metre temporary track opened on 6 September but carries construction plant only; daytime repair closures at Parewabhir (Gajuri-2) are ordered day by day."
  ],
  /* The FAQ answer people actually search for. */
  [
    "The Parewabhir section in Gajuri-2 is closed to all but ambulances and hearses from 6am to 6pm on 6 September for repairs.",
    "The Parewabhir section in Gajuri-2 is shut to all but ambulances and hearses from 6am to 6pm on repair days — ordered on 5 and again on 6 September — so check whether one is in force before setting out."
  ],
  /* The donation FAQ now carries the running total. */
  [
    "Donate through the official Prime Minister Disaster Relief Fund using its published bank accounts, Fonepay QR codes, or the Government of Nepal online portal operated via NCHL. Details are on the Relief Fund page.",
    "Donate through the official Prime Minister Disaster Relief Fund using its published bank accounts, Fonepay QR codes, or the Government of Nepal online portal operated via NCHL. The fund passed Rs 10 billion on 6 September 2026, most of it raised by QR code in donations of under Rs 100. Details are on the Relief Fund page."
  ],
];

/* Previous value \u2192 current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ['"dateModified":"2026-09-06"', '"dateModified":"2026-09-07"'],
  ['"datePosted":"2026-09-06T10:30:00+05:45"', '"datePosted":"2026-09-07T12:30:00+05:45"'],
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
