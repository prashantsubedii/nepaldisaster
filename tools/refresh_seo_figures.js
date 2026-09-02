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

   Current hop: 2 Sept midday → 2 Sept, after PM Balen Shah's statement to
   Parliament (11,993 rescued) and the Nepal Police toll of 1,127.
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
    "1,114 confirmed dead, 3,916 missing, 11,814 rescued (NDRRMA, 2 Sept)",
    "1,127 dead, 3,916 missing, 11,993 rescued (2 Sept)"
  ],
  [
    "Security forces had rescued 11,814 people as of 2 September 2026",
    "Prime Minister Balen Shah told Parliament on 2 September 2026 that 11,993 people had been rescued"
  ],
  ["1,127 confirmed (NDRRMA, 2 Sept, Nepal side)", "1,127 confirmed (Nepal Police, 2 Sept, Nepal side)"],
  ["1,114 confirmed (NDRRMA, 2 Sept, Nepal side)", "1,127 confirmed (Nepal Police, 2 Sept, Nepal side)"],
  [
    "NDRRMA confirmed 1,114 deaths as of 2 September 2026",
    "Nepal Police put the death toll at 1,127 as of 2 September 2026"
  ],
];

/* Previous value → current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ["1,114 confirmed dead, 3,916 missing, 11,814 rescued", "1,127 confirmed dead, 3,916 missing, 11,993 rescued"],
  ["1,114 dead, 3,916 missing, 11,814 rescued", "1,127 dead, 3,916 missing, 11,993 rescued"],
  ["1,114 dead and 3,916 missing", "1,127 dead and 3,916 missing"],
  ["11,814 rescued by security forces", "11,993 rescued by security forces"],
  ["11,814 rescued by joint security for", "11,993 rescued by joint security for"],
  ["11,814 people have been rescued", "11,993 people have been rescued"],
  ["11,814 people as of", "11,993 people as of"],
  ["1,114 deaths as of", "1,127 deaths as of"],
  ["1,114 confirmed dead", "1,127 confirmed dead"],
  ["killing 1,100+ people", "killing 1,120+ people"],
  ["11,814 rescued", "11,993 rescued"],
  ["11,814", "11,993"],
  ["1,114", "1,127"],
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
