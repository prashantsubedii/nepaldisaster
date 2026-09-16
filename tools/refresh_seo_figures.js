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

   Current hop: 7 September 2026 -> 16 September 2026.

   The casualty figures moved this time. The latest official Nepal-side toll
   (Wikipedia's 2026 Nepal–Tibet floods article, as of 12 September, matching
   the MoFA daily situation updates of 10 September) is 1,386 dead, 5,130
   missing, 6,827 injured and 13,728 rescued — so the crawler copy is re-dated
   to "12 September 2026". Missing rose (revised up as more people were reported
   out of contact); deaths, injured and rescued rose too.

   What else moved: the Prithvi Highway at Krishnabhir is REOPENING — the Dept.
   of Roads says the 252-metre track returns to full two-way public traffic on
   17 September, so the road one-liner and the highway FAQ are rewritten from
   "still cut" to "reopening". The PM Disaster Relief Fund passed Rs 13.23
   billion (US$86.69 million) by 11 September. dateModified/datePosted bumped.

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
    "The Prithvi Highway is still cut at Krishnabhir in Dhading, where a 252-metre temporary track opened on 6 September but carries construction plant only; daytime repair closures at Parewabhir (Gajuri-2) are ordered day by day.",
    "The Prithvi Highway at Krishnabhir in Dhading reopens to full two-way public traffic on 17 September; gas tankers and heavy vehicles have crossed the 252-metre temporary track one-way since mid-September, with drainage work continuing beside live traffic."
  ],
  /* The FAQ answer people actually search for — first sentence only. */
  [
    "The Parewabhir section in Gajuri-2 is shut to all but ambulances and hearses from 6am to 6pm on repair days — ordered on 5 and again on 6 September — so check whether one is in force before setting out.",
    "The Prithvi Highway at Krishnabhir reopens to full two-way public traffic on 17 September; gas tankers and heavy vehicles have crossed the 252-metre track one-way since mid-September, with drainage work continuing beside live traffic. The Parewabhir section in Gajuri-2 ran one-way over a temporary track, with daytime repair closures ordered only on 5–6 September; check before setting out."
  ],
  /* The donation FAQ carries the running total. */
  [
    "The fund passed Rs 10 billion on 6 September 2026, most of it raised by QR code in donations of under Rs 100. Details are on the Relief Fund page.",
    "The fund passed Rs 13.23 billion (about US$86.69 million) by 11 September 2026, most of it raised by QR code in donations of under Rs 100. Details are on the Relief Fund page."
  ],
];

/* Previous value \u2192 current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ['1,344', '1,386'],
  ['4,886', '5,130'],
  ['13,013', '13,728'],
  ['5,300', '6,827'],
  ['589 foreign', '587 foreign'],
  ['as of 5 September 2026', 'as of 12 September 2026'],
  ['NDRRMA, 5 Sept, Nepal side', 'NDRRMA, 12 Sept, Nepal side'],
  ['(Nepali officials, 5 Sept)', '(Nepali officials, 12 Sept)'],
  ['(5 Sept)', '(12 Sept)'],
  ['"dateModified":"2026-09-07"', '"dateModified":"2026-09-16"'],
  ['"datePosted":"2026-09-07T12:30:00+05:45"', '"datePosted":"2026-09-16T12:00:00+05:45"'],
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
