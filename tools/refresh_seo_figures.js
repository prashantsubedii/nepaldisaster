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

   Current hop: 2 Sept (Nepal Police toll 1,127 / 3,916 missing / 1,473 injured)
   → NDRRMA's 3 September update (1,259 dead / 5,083 missing / 5,000+ injured /
   590 foreign nationals from 39 countries).

   NOTE ON DATES: the rescued total of 11,993 is still the PM's 2 September
   statement to Parliament and has NOT moved, so "2 September" must survive
   wherever it dates the rescue figure. Only the sentences that date the toll
   are re-dated, which is why those swaps are written out in full below rather
   than done as a blanket date replacement.
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
    "1,127 dead, 3,916 missing, 11,993 rescued (2 Sept)",
    "1,259 dead, 5,083 missing, 11,993 rescued (3 Sept)"
  ],
  [
    "NDRRMA confirms 1,127 dead and 3,916 missing in the Bhotekoshi–Trishuli flood as of 2 September 2026.",
    "NDRRMA confirms 1,259 dead and 5,083 missing in the Bhotekoshi–Trishuli flood as of 3 September 2026."
  ],
  [
    "Nepal Police put the death toll at 1,127 as of 2 September 2026.",
    "NDRRMA put the death toll at 1,259 as of 3 September 2026."
  ],
  [
    "3,916 people remain missing as of 2 September 2026.",
    "5,083 people remain missing as of 3 September 2026."
  ],
  [
    "583 foreign nationals from 38 countries",
    "590 foreign nationals from 39 countries"
  ],
  [
    "1,127 confirmed (Nepal Police, 2 Sept, Nepal side)",
    "1,259 confirmed (NDRRMA, 3 Sept, Nepal side)"
  ],
  [
    "3,916 reported missing or out of contact (Nepal side)",
    "5,083 reported missing or out of contact (Nepal side)"
  ],
  [
    "3,916 reported missing including 583 foreign nationals",
    "5,083 reported missing including 590 foreign nationals"
  ],
  [
    "1,127 dead, 3,916 missing, 11,993 rescued, 1,473 injured / 2,740 treated",
    "1,259 dead, 5,083 missing, 11,993 rescued, 5,000+ injured / 2,740 treated"
  ],
  [
    "killing 1,120+ people and leaving more than 3,900 missing",
    "killing 1,250+ people and leaving more than 5,000 missing"
  ],
];

/* Previous value → current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ["1,127 dead, 3,916 missing, 11,993 rescued", "1,259 dead, 5,083 missing, 11,993 rescued"],
  ["1,127 dead and 3,916 missing", "1,259 dead and 5,083 missing"],
  ["583 foreign nationals", "590 foreign nationals"],
  ["1,473 injured", "5,000+ injured"],
  ["1,127", "1,259"],
  ["3,916", "5,083"],
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
