# Data sources (Phase 0 check, 26 Nov 2026)

What official data NepalDisaster can rely on, how fresh it is, and what we may do with it.
Checked with read-only requests on 26 Nov 2026 (NPT). Re-check before each monsoon.

Rule for the whole site: we only relay official data. If a source goes quiet, the page says
when we last heard from it. It never falls back to "all clear".

## Live hazard data

| Source | What it gives | Freshness found | Access | Notes |
|---|---|---|---|---|
| BIPAD `/api/v1/alert/` | DHM river, rain and road alerts, tagged to ward | Newest alert 21 Nov 2026 (alerts only appear when a threshold is crossed) | Public JSON, no key | Already used by `/api/warnings`. ~135 KB, ~3 s per call. |
| BIPAD `/api/v1/river/` | Every DHM river station: water level, warning level, danger level, trend (`steady`), time | Readings every ~10 min; newest ~15 min old | Public JSON, no key | **Must use `ordering=-modified_on`.** The default order returns September 2026 readings. Some stations have no danger level. |
| BIPAD `/api/v1/rain/` | Rain stations with hourly and multi-hour totals | Newest reading current to the hour | Public JSON, no key | Use `ordering=-measured_on`. |
| BIPAD `/api/v1/incident/` | Reported incidents with `verified` and `approved` flags, ward links | Newest 25 Nov 2026 | Public JSON, no key | Only show `verified`/`approved` incidents. |
| BIPAD `/api/v1/earthquake/` | Earthquakes with ward and municipality | **Stale: newest 22 Aug 2025** | Public JSON | Do not use for earthquakes. |
| NSC, seismonepal.gov.np | Earthquakes with time (BS and AD), magnitude, location, "Did you feel it?" link | Current: M5.6 Taplejung, 24 Nov 2026 | **HTML page only, no feed** | Read the homepage table politely (once a minute at most) and ask NSC for a feed. |
| GDACS | International flood, cyclone and earthquake events | Event-level, slow-moving | Public JSON, no key | Already used by `/api/alerts`. Fallback, not primary. |
| hydrology.gov.np | DHM's own station site | — | Web app, no documented API | BIPAD carries the same station data. |
| Google Flood Hub | 7-day river forecasts | — | API needs approval | Nepal coverage not confirmed. |
| GloFAS (Copernicus) | Global river forecasts, used by FloodShield for 2/5/20-year flood levels | Daily | Free account | Guidance only; must be labelled "forecast guidance, not an official warning". |

## Places

| Source | What it gives | Licence | Use |
|---|---|---|---|
| HDX "Nepal – Subnational Administrative Boundaries" (COD-AB), from the Survey Department of Nepal and UN RCO | Boundaries for country, 7 provinces, 77 districts and 775 level-3 areas (the 753 local governments plus parks and reserves). Updated Aug 2026. **No ward level.** | CC BY-IGO: free to use with credit | Shapes for every local government page (F1) |
| BIPAD `/api/v1/municipality/` | 774 areas with English and Nepali names, type, code, bounding box, centre point | Not published; ask NDRRMA | Nepali names and ID matching with BIPAD alerts |
| BIPAD `/api/v1/ward/` | 6,803 wards with bounding box and centre point (no shapes) | Not published; ask NDRRMA | "Find my ward" and ward pages without needing ward shapes |

Decision for F1: launch on local-government shapes from HDX (licence clear). Add ward pages using
BIPAD ward centre points once NDRRMA confirms we may reuse them (included in the data request).

## Gaps to raise in the data request to NDRRMA, DHM and NSC

1. Permission to reuse BIPAD data (alerts, stations, incidents, municipality and ward lists) on a public site, with credit.
2. A feed for NSC earthquakes (CAP, JSON or RSS).
3. Whether DHM publishes, or plans to publish, warnings in CAP format.
4. Whether danger levels missing on some river stations can be filled in.
5. A contact for reporting data problems we notice.
