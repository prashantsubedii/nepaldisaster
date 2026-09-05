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

   Current hop: NDRRMA's 3 September update (1,259 dead / 5,083 missing /
   5,000+ injured / 590 foreign) → its 5 September update (1,344 dead / 4,886
   missing / 5,300 injured / 589 foreign / 13,013 rescued including 324 foreign
   nationals), plus Nepal's first official damage estimate of Rs 387.54 billion
   published on 4 September.

   NOTE ON DATES: the rescued total moved this time — it is no longer the PM's
   2 September statement but the officials' 5 September figure — so the "2
   September" wording that dated it is retired along with the number. The
   missing count FELL, from 5,083 to 4,886, as names were matched against the
   rescue registry and the recovered dead; that is a real revision, not a
   lagging report, and the crawler copy has to follow it down as well as up.
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
    "1,259 dead, 5,083 missing, 11,993 rescued (3 Sept)",
    "1,344 dead, 4,886 missing, 13,013 rescued (5 Sept)"
  ],
  [
    "NDRRMA confirms 1,259 dead and 5,083 missing in the Bhotekoshi–Trishuli flood as of 3 September 2026.",
    "NDRRMA confirms 1,344 dead and 4,886 missing in the Bhotekoshi–Trishuli flood as of 5 September 2026."
  ],
  [
    "NDRRMA put the death toll at 1,259 as of 3 September 2026. Around 900 bodies have been recovered",
    "NDRRMA put the death toll at 1,344 as of 5 September 2026. 1,030 bodies have been temporarily buried after procedure"
  ],
  [
    "5,083 people remain missing as of 3 September 2026.",
    "4,886 people remain missing as of 5 September 2026."
  ],
  [
    "590 foreign nationals from 39 countries",
    "589 foreign nationals from 39 countries"
  ],
  [
    "1,259 confirmed (NDRRMA, 3 Sept, Nepal side)",
    "1,344 confirmed (NDRRMA, 5 Sept, Nepal side)"
  ],
  [
    "5,083 reported missing or out of contact (Nepal side)",
    "4,886 reported missing or out of contact (Nepal side)"
  ],
  [
    "5,083 reported missing including 590 foreign nationals",
    "4,886 reported missing including 589 foreign nationals"
  ],
  [
    "1,259 dead, 5,083 missing, 11,993 rescued, 5,000+ injured / 2,740 treated",
    "1,344 dead, 4,886 missing, 13,013 rescued, 5,300 injured / 2,740 treated"
  ],
  [
    "killing 1,250+ people and leaving more than 5,000 missing",
    "killing 1,340+ people and leaving nearly 4,900 missing"
  ],
  [
    "11,993 rescued by joint security forces (NDRRMA, 2 Sept)",
    "13,013 rescued by joint security forces (Nepali officials, 5 Sept)"
  ],
  [
    "11,993 rescued by security forces; 4,248 individually named in the official NDRRMA registry",
    "13,013 rescued by security forces; 5,006 individually named in the official NDRRMA registry"
  ],
  [
    "total preliminary damages estimated near Rs 200 billion ($4–$5B)",
    "Nepal's first official damage estimate at Rs 387.54 billion ($2.56B, NDRRMA, 4 Sept)"
  ],
  [
    "4,248 individually named in the public family tracing registry",
    "5,006 individually named in the public family tracing registry"
  ],
  [
    "as of 5 September 2026. 11,993 people have been rescued and 21,000+ security personnel are deployed.",
    "as of 5 September 2026. 13,013 people have been rescued and 21,400+ security personnel are deployed."
  ],
  /* The PM statement is dated and still true as history, but it is answering
     the question "how many have been rescued", so it has to carry the current
     figure and cite the authority that published it. */
  [
    "Prime Minister Balen Shah told Parliament on 2 September 2026 that 11,993 people had been rescued, including 279 airlifted from a hydropower tunnel over two days and 252 foreign nationals flown out by helicopter. 21,000+ security personnel are deployed — 8,722 Nepali Army, 7,894 Nepal Police and 4,203 Armed Police Force.",
    "Nepali officials put the total rescued at 13,013 as of 5 September 2026, including 324 foreign nationals; 5,006 of them are individually named in the public NDRRMA tracing registry. The Prime Minister had given Parliament a figure of 11,993 on 2 September. 21,400+ security personnel are deployed — 9,300 Nepali Army, 7,912 Nepal Police and 4,203 Armed Police Force."
  ],
  [
    "21,000+ active personnel (Nepali Army 8,722, Nepal Police 7,894, Armed Police Force 4,203)",
    "21,400+ active personnel (Nepali Army 9,300, Nepal Police 7,912, Armed Police Force 4,203)"
  ],
  [
    "and 21,000+ security personnel deployed",
    "and 21,400+ security personnel deployed"
  ],
];

/* Previous value → current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ["1,259 dead, 5,083 missing, 11,993 rescued", "1,344 dead, 4,886 missing, 13,013 rescued"],
  ["1,259 dead and 5,083 missing", "1,344 dead and 4,886 missing"],
  ["590 foreign nationals", "589 foreign nationals"],
  ["5,000+ injured", "5,300 injured"],
  ["1,259", "1,344"],
  ["5,083", "4,886"],
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
