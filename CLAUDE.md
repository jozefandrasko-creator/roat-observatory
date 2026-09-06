# ROAT Observatory — working notes for Claude

Read this before touching anything. It is the hand-off from the session that built the repository (5–6 September 2026) and the rules that keep the published data trustworthy.

## What this is

Static, versioned publication of ROAT's comparative models of automated-vehicle deployment governance (Faculty of Law, Comenius University Bratislava; author Jozef Andraško). Data comes from the **ROAT Intelligence Hub** (Google Sheet `1G_jtoKunmcY0BTuTCEZBe21cMxiOH6fJdsduZRRKXGc`) at dated snapshots. Specification: `ARCHITECTURE.md` (v0.2 + amendments A1–A3). Runbook: `RELEASE.md` (including the Windows routine). History: `CHANGELOG.md`.

- Live site: https://jozefandrasko-creator.github.io/roat-observatory/ (GitHub Pages, built by `.github/workflows/build.yml` on every push to `main`).
- Release v0.1.0 → Zenodo version DOI `10.5281/zenodo.22409314`, concept DOI `10.5281/zenodo.22409313` (all versions). Release v0.2.0 (2026-09-06) → version DOI `10.5281/zenodo.22546848`, written into second-gate/2026-09-07 and human-roles/2026-09-07 (review); the three snapshots carrying the v0.1.0 DOI keep it. `.zenodo.json` (`upload_type: dataset`) governs Zenodo metadata from v0.2.0 on.
- Zero npm dependencies; Node ≥ 20. Scripts are plain ESM in `scripts/`, templates in `src/templates.mjs`.

## Hard rules

1. **The Hub is read-only for automation.** `scripts/hub-sync.mjs` reads exports; nothing here writes to the Sheet. Hub edits are done by the author (directly or through a ChatGPT prompt with expected-current-value preconditions — see `Claude outputs/ROAT-prompt-*.md` for the pattern). Do not propose scripts that write to the Sheet without a separate security review.
2. **Never commit `hub-export/`**, `site/`, or `Claude outputs/` (all git-ignored). The raw register carries internal notes. Before every commit: `git status --porcelain | Select-String "hub-export|site/|Claude outputs"` must print nothing. Check untracked files in the repository root too (`git status --short`): a subagent or an ad-hoc script can drop a parsed copy of the Register there, and the pattern above would not catch it.
3. **Published and review snapshots are frozen.** `data/modules/<slug>/<date>/data.json` for a snapshot that has been released is never regenerated; a changed coding becomes a *new* dated snapshot with `supersedes`. When a full `npm run sync` touches an old snapshot, revert it (`git checkout -- data/modules/<slug>/<date>/`). Only timestamps (`exported_from_hub`) are allowed to differ, and even those are reverted.
4. **Evidence gate.** A cell may cite a Hub record only if Research Stage ≥ Verified and Evidence Level ≤ 4. `npm run validate` enforces it (errors block the build; draft snapshots downgrade to warnings). Module 03 uses `evidence_policy: publish-evidenced-rows`.
5. **Embargo.** A module snapshot becomes `published` only after its companion manuscript has been submitted (Architecture §9.3). Modules 01 and 02 are therefore `review`; Module 07 has no manuscript and is `published`.
6. **DOI write-back** goes only into snapshots that a release actually contains (`"doi": "10.5281/zenodo.NNNNNNNN"`, the version DOI); draft snapshots keep `null`.
7. The author's email/name for commits: `Jozef Andrasko <jozefandrasko@gmail.com>`.

## Current state (2026-09-06)

| Module | Latest snapshot | Status | Sources published |
|---|---|---|---|
| 01 Layered normalisation | 2026-08-25 (+ longitudinal panel `historical-uk`, draft) | review | 23/23 (panel 26/26) |
| 02 Second Gate | 2026-09-07 (supersedes 2026-08-31, which carries the v0.1.0 DOI; machine-assisted blind second pass recorded, China draft row first-pass only) | review | 24/24 |
| 03 Human roles | 2026-09-07 (supersedes 2026-09-06; machine-assisted blind second pass recorded, 7 roles still first-pass only) | review | 30/30 |
| 07 Regulatory method | 2026-09-05 | published | 1/1 |

Source Library: 65 published records (0263 Wansley, *Backroom Drivers*, added by prompt 18b), all 64 earlier public texts reviewed on 2026-09-06 (`Claude outputs/Public-Library-kontrola-2026-09-06b.md`, applied by prompt 9). Register: 372 records (highest id ROAT-2026-0376). `hub-export/` on 2026-09-06 evening: Outputs and Public Library rebuilt from the live Sheet via the Drive connector (verified cell-by-cell against Google's 14:38 export), Intelligence Register is the 14:38 export with rows 0245/0263 patched to the values prompt 18b wrote — replace with a full export at the next sync. Validation: 0 errors · 51 warnings (48 on the superseded human-roles/2026-09-05 snapshot, the rest are review/draft banners). All eight `ROAT-CON-*` definitions approved by the author on 2026-09-06. Companion outputs resolve: Module 01 → OUT-013 (working title, created by prompt 18), Module 03 → OUT-002 (BLF 2026 contribution, retitled by prompt 18); both public in `content/research.json`; `external_outputs_pending` in `data/ids.json` is empty.

The Hub now has guards (prompts 6 and 7, 2026-09-06): Data validation with reject on 31 Register columns, and a `Checks` sheet with 30 integrity formulas whose baseline is in column D. After prompt 8 every check except the three informative counts is at zero (baseline re-recorded 2026-09-06). Read `Checks` before and after any Hub prompt; the `roat-hub-edit` skill (source in `Claude outputs/skills/roat-hub-edit/`, packaged as `.skill`) encodes the prompt pattern, the live gviz read and the verification step.

## Open items, in order

1. When companion manuscripts are submitted: set the snapshot `status` to `published` (01: `ROAT-SNAP-LAYERS-2026-08-25`, 02: latest `ROAT-SNAP-SECOND-GATE-*`, 03: latest `ROAT-SNAP-ROLES-*`), bump version, release v0.3.0, write the new DOI back. (Companion OUT-* ids are resolved since 2026-09-06.)
2. Hub hygiene backlog (not blocking the Observatory). Done on 2026-09-06 by prompts 10 and 11: Legal Status on 56 legal-type records, 14 placeholder titles resolved, 0142 rejected as a duplicate of 0120. 0174 (Arizona § 28-9702) resolved by prompt 15. 0245 and 0263 SSRN metadata closed by prompt 18b (2026-09-06; author supplied the PDFs and posting dates, SSRN blocks every automated reader): 0263 Verified/Level 3/Published, 0245 Verified/Level 4/Draft. Hygiene backlog is empty except 0318–0321 public fields (kept in Review on purpose); 0262 Official Source points to the analysed Croatian gazette rather than the ROAT analysis itself (author's choice pending a public URL).
3. Decided 2026-09-06: the Sheet stays private and the Monday `hub-sync.yml` stays dormant (no `HUB_SHEET_ID` secret) — the Sheet ID is in the public repository, so link-readable would publish the whole Register with its internal notes; exports stay manual (or via the Drive connector from a Claude session). Zenodo record type: `.zenodo.json` makes new releases Datasets; the v0.1.0 record is changed by hand in Zenodo (Edit → Resource type).

## Routine (Windows, PowerShell, in the repo folder)

Export the nine sheets from Google Sheets (File → Download → CSV; Google's file names are accepted as is) into `hub-export\`, then:

```powershell
npm run sync                      # or: node scripts/hub-sync.mjs --module=<slug> --snapshot-date=YYYY-MM-DD
# complete data\modules\<slug>\<date>\snapshot.json (coder, second_pass, caveats, supersedes, status)
npm run validate                  # must end with 0 errors
npm run build; npm run serve      # http://localhost:8080, Ctrl+C
git add .; git status --porcelain | Select-String "hub-export|site/|Claude outputs"
git commit -m "..." ; git push
```

When only the Register changed (a Public Editorial Queue, a repair), run `node scripts/hub-sync.mjs --module=none`: it refreshes `data/hub/*.json` from Intelligence Register, Public Library and Outputs and leaves every snapshot folder alone, so nothing has to be reverted and no new dated folder appears for Module 07. Those three sheets can also be fetched by name from a signed-in browser via `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&headers=1&sheet=<name>` (rename the `data*.csv` downloads to `<Sheet name>.csv`). Regenerate the committed report with `node scripts/validate.mjs --report`.

Sheets read by the sync: Intelligence Register, Public Library, Outputs, Cross-section 2026 – AV Normalisation, Post-Type-Approval Deployment Models, Roles & Concepts, Role Function Matrix, Layer Coding – AV History, ROAT Regulatory Method. When the Public Library sheet is empty the Source Library is derived from the Register's public columns (Public Status = Published only).

`npm run review-queue` prints what the Observatory needs re-verified (overdue Next Check Dates, unpublished sources, stale overviews) in the Monday-review format.

## Conventions

- IDs: `ROAT-MOD-*` modules, `ROAT-SNAP-<MOD>-<date>` snapshots, `ROAT-JUR-*` jurisdictions (variants `ROAT-JUR-SK:1329`, `ROAT-JUR-UK:1861`), `RC-NNN` role concepts, `ROAT-CON-*` defined concepts (`content/concepts/*.json`, `definition_status` draft until the author approves; `approved` holds the date, `drafted` the provenance note); all resolvable at `/id/<ID>/`. Registry: `data/ids.json`.
- Snapshots that declare `supersedes` get a build-time cell diff ("What changed") against the snapshot they replace; the superseded snapshot shows a forward-linking banner. No data is written for this; it is computed from the frozen files.
- Source Library (`/sources/`) filters client-side (search + facets: category, jurisdiction, type, citing module, legal status); the state is in the URL query, so `/sources/?jurisdiction=Germany` is a linkable view. JSON-LD on source, module, snapshot, concept and research pages; canonical links, `sitemap.xml` and `robots.txt` are generated from the pages the build writes. Absolute URLs = `SITE_ORIGIN` (default `https://jozefandrasko-creator.github.io`) + `SITE_BASE` (CI sets `/roat-observatory/`).
- Slovak layer: `content/sk/index.md`, `content/sk/o-projekte.md`, `content/sk/modules/<slug>.md` → `/sk/`, `/sk/o-projekte/`, `/sk/moduly/<slug>/`; overview prose only, data stays English and is linked. Front matter `status` is `draft` (badge, hint, validate warning) until the author writes `approved` (all six approved 2026-09-06; `drafted` keeps the provenance note, `approved` the date). Paired EN/SK pages get `hreflang` links and the nav language switch automatically (`langPairs` in build.mjs).
- Landscape map: `content/landscape/<date>.json` (76 boxes, 12 pillars, 5 layers, 6 status classes) renders at `/map/`; imported from the ROAT Regulatory Map workbook v0.7.1 by `Claude outputs/tools/landscape-from-xlsx.mjs`. Once the Hub carries a `Regulatory Map` sheet (prompt 21), `hub-sync` writes `data/hub/landscape.json` and the build prefers it. The sheet exists since 2026-09-06 (prompts 21 and 23; CHK-31 0, CHK-32 8) and `data/hub/landscape.json` is live, so the map now refreshes from the Hub and `content/landscape/2026-08-27.json` stays as the original dated import. Lesson from the first sync: whenever a prompt carries a generated data block, diff the sheet against the repo file before syncing — the author may have pasted an earlier copy of the block, as happened with eight cells here. Boxes reference Hub records and link to `/sources/<id>/` only when the record is Published, so the map doubles as a publication queue: 55 of the 88 referenced records are still unpublished.
- Navigation layer: `content/guide/{decision-tree,journey,slovakia-stack}.json` render at `/map/decision-tree/`, `/map/journey/`, `/map/slovakia/` and (Slovak) `/sk/slovensko-v-stacku/`. Imported from the workbook; `status` is `draft` until the author approves. The Slovak stack page shares one JSON with the English one (`*_sk` fields).
- Vocabularies: `data/vocabularies.json` (N0–N4 scale, role polarity, Hub publishable stages and evidence max).
- Line endings: LF everywhere, enforced by `.gitattributes` (`* text=auto eol=lf`, added 2026-09-06 after a Windows save turned a frozen snapshot into a 520-line CRLF-only diff). If `git status` ever lists a frozen snapshot, check `git diff -w` first — a whitespace-only diff is just line endings and is reverted, not committed.
- Windows: scripts resolve their own path with `fileURLToPath` (never `URL.pathname`); `serve.mjs` normalises URLs before `path.join`. Keep it that way.
- Language: repository, site and commit messages in English; conversation with the author in Slovak.
