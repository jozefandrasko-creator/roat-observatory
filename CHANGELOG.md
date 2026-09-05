# Changelog

## v0.1.0 — first public release (2026-09-05)
- Windows fix: scripts resolve their own directory with `fileURLToPath` instead of `new URL(import.meta.url).pathname`, which on Windows yields `/C:/…` and resolved to `C:\C:\…`.
- Changelog page generated from this file plus every snapshot the site holds; release runbook in RELEASE.md; base-path build verified for GitHub Pages project sites.
- 2026-09-05, evening: Hub repaired (column shift on ROAT-2026-0360..0366, 53 Used In values, 57 evidence-pairing values, 17 single cells). Re-synced: 0 validation errors, warnings down from 272 to 181.
- Module 07 (ROAT regulatory analysis framework) added and published: 13 stages from the Hub's method sheet, no embargo because it has no companion manuscript.
- Amendment A3: method modules (`kind: "method"`, `stages` parser) and partial publication (`evidence_policy: publish-evidenced-rows`, Pending evidence section).
- Amendment A2: role-function cells are qualified values (polarity + qualifier), not a closed vocabulary — 88 spurious warnings removed without flattening the matrix.
- Pipeline: hub-sync (CSV export or Sheets URL) → validate (build gates) → build (static site) → serve.
- Modules: 01 Layered normalisation (snapshot 2026-08-25, status review; plus the longitudinal panel `historical-uk` — UK 1861–1930, EU/UNECE 2018–2026, GB 2024–2026 — from the Layer Coding sheet, status draft), 02 Second Gate (snapshot 2026-08-31, status review), 03 Human roles (snapshot 2026-09-05, draft).
- Jurisdiction profiles: EU/UNECE, Germany, France, Croatia, Great Britain, China, Slovakia.
- 2026-09-05, later: Hub corrected (France row realigned; ROAT-2026-0001 removed from China core records; ROAT-2026-0317 replaced by ROAT-2026-0311 in the print 1329 row). First clean `npm run build`: 0 errors. Remaining warnings are Public Library status (no record Published yet), draft-panel evidence gaps in Module 03, and placeholder companion OUT ids.
- Validation on first sync had found: ROAT-2026-0001 (Level 5) and ROAT-2026-0317 (Signal, Level 6) cited as core records; France row misaligned in the Second Gate sheet (legal status and core records empty, values shifted); ROAT-2026-0120 and 0172 in the roles matrix below the evidence gate. These must be fixed in the Hub before `npm run build` passes.
