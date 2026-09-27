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

   Current hop: 24 September 2026 -> 27 September 2026.

   No new national flood toll has been published since NDRRMA's 20 September
   update (1,451 dead / 5,786 missing / 13,784 rescued), so the casualty
   figures are deliberately NOT swapped. Wikipedia's "9,287 injured" is the Army
   personnel count miscited to a 15 Sept article; do not adopt it. The 21 Sept
   "5,745 missing" there comes from a 23 Sept feature, not a dated NDRRMA figure.
   What moved is the road copy: the 24–27 Sept rain blocked sections of 11
   highways (Dept. of Roads, 27 Sept), so the stale "Krishnabhir reopens on
   17 September" / "cut at Krishnabhir" sentences are replaced in PROSE.
   dateModified/datePosted bumped.

   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");

/* Longer prose swaps for the JSON-LD answer text and meta descriptions, applied
   before the numeric table so their wording stays coherent. */
const PROSE = [
  ["The Prithvi Highway’s Mugling–Kathmandu section is still cut at Krishnabhir in Benighat Rorang, Dhading. A 252-metre temporary track opened there on 6 September but carries construction plant only, and the Department of Roads puts normal traffic about a week away. The Prithvi Highway at Krishnabhir reopens to full two-way public traffic on 17 September; gas tankers and heavy vehicles have crossed the 252-metre track one-way since mid-September, with drainage work continuing beside live traffic. The Parewabhir section in Gajuri-2 ran one-way over a temporary track, with daytime repair closures ordered only on 5–6 September; check before setting out.",
   "Heavy rain on 24–27 September blocked sections of 11 major highways (Department of Roads, 27 September). The Prithvi Highway, which reopened to two-way traffic at Krishnabhir on 17 September, has fresh bottlenecks at Krishnabhir, Chauki Bhir, Jawang Khola and Fisling. The BP Highway is obstructed at Mamti, Piple, Daunne–Kalopul, Charsayabesi, Katunje and Chaukidanda. The Baglung–Beni road, the Kaligandaki Corridor, the Mid-Hill Highway in Baglung, the Tamor Corridor, the Siddhicharan, the Rapti Highway and the Nagma–Jumla road are also blocked."],
  ["The Prithvi Highway at Krishnabhir in Dhading reopens to full two-way public traffic on 17 September; gas tankers and heavy vehicles have crossed the 252-metre temporary track one-way since mid-September, with drainage work continuing beside live traffic.",
   "Heavy rain on 24–27 September killed at least 14 people in 72 hours (NDRRMA) and blocked sections of 11 highways, including the Prithvi at Krishnabhir (Department of Roads, 27 September)."],
  ["Prithvi Highway cut at Krishnabhir, Betrawati–Rasuwagadhi destroyed, BP Highway night bans — with detours and traffic contacts.",
   "Rain landslides block 11 highways including the Prithvi and BP (27 Sept); Betrawati–Rasuwagadhi destroyed — with detours and traffic contacts."],
];

/* Previous value \u2192 current value. Order matters: longer/more specific strings
   must come before shorter ones that they contain. */
const FIGURES = [
  ['"dateModified":"2026-09-24"', '"dateModified":"2026-09-27"'],
  ['"datePosted":"2026-09-24T12:00:00+05:45"', '"datePosted":"2026-09-27T14:00:00+05:45"'],
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
