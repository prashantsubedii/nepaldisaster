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

   Current hop: 16 September 2026 -> 24 September 2026.

   NDRRMA's update of Sunday 20 September (reported by The Tribune, matching
   Wikipedia's Nepal-side figure) is 1,451 dead, 5,786 missing including 636
   foreign nationals, and 13,784 rescued. Missing ROSE again as more people were
   reported out of contact. No newer injured figure was published, so 6,827
   (12 Sept) is left alone. dateModified/datePosted bumped.

   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");

/* Longer prose swaps for the JSON-LD answer text and meta descriptions, applied
   before the numeric table so their wording stays coherent. */
const PROSE = [
];

/* Previous value \u2192 current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ['1,386', '1,451'],
  ['5,130', '5,786'],
  ['13,728', '13,784'],
  ['587 foreign', '636 foreign'],
  ['as of 12 September 2026', 'as of 20 September 2026'],
  ['NDRRMA, 12 Sept, Nepal side', 'NDRRMA, 20 Sept, Nepal side'],
  ['(Nepali officials, 12 Sept)', '(NDRRMA, 20 Sept)'],
  ['(12 Sept)', '(20 Sept)'],
  ['"dateModified":"2026-09-16"', '"dateModified":"2026-09-24"'],
  ['"datePosted":"2026-09-16T12:00:00+05:45"', '"datePosted":"2026-09-24T12:00:00+05:45"'],
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
