# ROAT Observatory

*How law lets automated vehicles onto the road.*

Static, versioned publication of ROAT's comparative models of automated-vehicle deployment governance, generated from the **ROAT Intelligence Hub** at dated snapshots. Specification: [ARCHITECTURE.md](ARCHITECTURE.md) (v0.2).

No dependencies beyond Node ≥ 20. Runs on Windows, macOS and Linux (on Windows, PowerShell may need `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once before `npm` will run). No framework: `scripts/` are plain Node modules and `src/templates.mjs` renders HTML.

## Pipeline

```
Hub (Google Sheet)            coding happens here, never in this repo
   │  File → Download → CSV per sheet into hub-export/      (or: npm run sync:url with HUB_SHEET_ID)
   ▼
npm run sync                  hub-export/*.csv → data/hub/*.json + data/modules/<slug>/<date>/{data.json,data.csv,snapshot.json}
   ▼
npm run validate              build gates (Architecture §9.5): IDs, dimensions, rationale, confidence, evidence gate, registry
   ▼
npm run build                 validate && generate site/           (npm run build:draft skips gates, stamps a DRAFT banner)
   ▼
npm run serve                 preview on http://localhost:8080
```

`hub-export/` is git-ignored — the raw register contains internal notes. What is committed is the public-safe register index (ID → stage, evidence level, legal status, public status), the Public Library rows, the public outputs, and the module snapshots.

## Layout

```
content/modules/<slug>.json + .md      module definition (dimensions, Hub sheet, regimes, relationships) + narrative
content/jurisdictions/<slug>.json+.md  overview paragraph and metadata; everything else is generated
content/method/*.md                    method pages (JSON front matter)
content/research.json                  OUT-* ids allowed on the public Research page
data/ids.json                          ROAT ID registry
data/vocabularies.json                 N-scale, confidence, role values, Hub vocabulary snapshot
data/modules/<slug>/<date>/            frozen snapshots — immutable once status = published
data/hub/                              generated from the Hub by hub-sync
scripts/                               hub-sync · validate · build · review-queue · serve
src/                                   templates.mjs · styles.css
site/                                  build output (git-ignored)
```

## Adding a module

1. Code the model in a Hub sheet (one row per regime, one column per dimension, plus rationale, confidence and core ROAT records).
2. Add `content/modules/<slug>.json` with the sheet name, a parser profile (`cross-section` or `single-table`), dimensions and the regime → `ROAT-JUR-*` map; register the ID in `data/ids.json`.
3. `npm run sync` writes the snapshot skeleton; complete `snapshot.json` (coder, second pass, caveats, status).
4. `npm run validate` until clean; `npm run build`.

## Additional panels

A module may carry non-dated panels next to its dated snapshots — Module 01 has `historical-uk`, the longitudinal N0–N4 panel from the Hub's *Layer Coding – AV History* sheet. They are declared as `extra_snapshots` in the module JSON (parser profile `longitudinal`, column aliases, panel → jurisdiction map) and rendered as their own frozen pages; they never count as the module's "latest" snapshot.

## Snapshot and release policy

A snapshot is immutable once `status: published`; corrections produce a new dated snapshot with `supersedes`. A module snapshot is published only after its companion manuscript has been submitted; until then it is `draft` or `review` and the page carries a banner. Releases are tagged and archived on Zenodo for a DOI, which is then written into `snapshot.json`.

## Releasing

`RELEASE.md` is the runbook: what to check before the first push, Pages and Zenodo setup, tagging, and writing the DOI back into the snapshots that a release contains.

## Licences

Content and data: CC BY 4.0. Code: MIT. Source documents remain under their own terms and are linked, not republished.
