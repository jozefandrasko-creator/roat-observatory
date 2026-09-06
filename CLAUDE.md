# ROAT Observatory — working notes for Claude

Read this before touching anything. It is the hand-off from the session that built the repository (5–6 September 2026) and the rules that keep the published data trustworthy.

## What this is

Static, versioned publication of ROAT's comparative models of automated-vehicle deployment governance (Faculty of Law, Comenius University Bratislava; author Jozef Andraško). Data comes from the **ROAT Intelligence Hub** (Google Sheet `1G_jtoKunmcY0BTuTCEZBe21cMxiOH6fJdsduZRRKXGc`) at dated snapshots. Specification: `ARCHITECTURE.md` (v0.2 + amendments A1–A3). Runbook: `RELEASE.md` (including the Windows routine). History: `CHANGELOG.md`.

- Live site: https://jozefandrasko-creator.github.io/roat-observatory/ (GitHub Pages, built by `.github/workflows/build.yml` on every push to `main`).
- Release v0.1.0 → Zenodo version DOI `10.5281/zenodo.22409314`, concept DOI `10.5281/zenodo.22409313` (all versions).
- Zero npm dependencies; Node ≥ 20. Scripts are plain ESM in `scripts/`, templates in `src/templates.mjs`.

## Hard rules

1. **The Hub is read-only for automation.** `scripts/hub-sync.mjs` reads exports; nothing here writes to the Sheet. Hub edits are done by the author (directly or through a ChatGPT prompt with expected-current-value preconditions — see `Claude outputs/ROAT-prompt-*.md` for the pattern). Do not propose scripts that write to the Sheet without a separate security review.
2. **Never commit `hub-export/`**, `site/`, or `Claude outputs/` (all git-ignored). The raw register carries internal notes. Before every commit: `git status --porcelain | Select-String "hub-export|site/|Claude outputs"` must print nothing.
3. **Published and review snapshots are frozen.** `data/modules/<slug>/<date>/data.json` for a snapshot that has been released is never regenerated; a changed coding becomes a *new* dated snapshot with `supersedes`. When a full `npm run sync` touches an old snapshot, revert it (`git checkout -- data/modules/<slug>/<date>/`). Only timestamps (`exported_from_hub`) are allowed to differ, and even those are reverted.
4. **Evidence gate.** A cell may cite a Hub record only if Research Stage ≥ Verified and Evidence Level ≤ 4. `npm run validate` enforces it (errors block the build; draft snapshots downgrade to warnings). Module 03 uses `evidence_policy: publish-evidenced-rows`.
5. **Embargo.** A module snapshot becomes `published` only after its companion manuscript has been submitted (Architecture §9.3). Modules 01 and 02 are therefore `review`; Module 07 has no manuscript and is `published`.
6. **DOI write-back** goes only into snapshots that a release actually contains (`"doi": "10.5281/zenodo.NNNNNNNN"`, the version DOI); draft snapshots keep `null`.
7. The author's email/name for commits: `Jozef Andrasko <jozefandrasko@gmail.com>`.

## Current state (2026-09-06)

| Module | Latest snapshot | Status | Sources published |
|---|---|---|---|
| 01 Layered normalisation | 2026-08-25 (+ longitudinal panel `historical-uk`, draft) | review | 23/23 (panel 26/26) |
| 02 Second Gate | 2026-08-31 | review | 24/24 |
| 03 Human roles | 2026-09-06 (supersedes 2026-09-05) | review | 30/30 |
| 07 Regulatory method | 2026-09-05 | published | 1/1 |

Source Library: 64 published records. Register: 371 records (highest id ROAT-2026-0375). Validation: 0 errors · 53 warnings (48 on the superseded human-roles/2026-09-05 snapshot, the rest are review/draft banners).

The Hub now has guards (prompts 6 and 7, 2026-09-06): Data validation with reject on 31 Register columns, and a `Checks` sheet with 30 integrity formulas whose baseline is in column D. Every "Musí byť 0" check is at zero. Read `Checks` before and after any Hub prompt; the `roat-hub-edit` skill (source in `Claude outputs/skills/roat-hub-edit/`, packaged as `.skill`) encodes the prompt pattern, the live gviz read and the verification step.

## Open items, in order

1. Hub author decisions surfaced by `Checks`: Reliability pairing for 0112 and 0245 (CHK-21), Next Check Date for 0359 (CHK-23), and column N (Impact Area) still carries a warning-only validation bound to `Lists!$P$2:$P$18` that does not see `Deployment`.
2. Author to read `Public-Library-kontrola-2026-09-06.md` (the public texts) and fix wording in the Hub; the ten Module 03 texts added on 2026-09-06 are in `ROAT-prompt-5-Public-Editorial-Queue-Modul-03.md`.
3. When companion manuscripts are submitted: set the snapshot `status` to `published` (01: `ROAT-SNAP-LAYERS-2026-08-25`, 02: `ROAT-SNAP-SECOND-GATE-2026-08-31`), replace placeholder companion outputs in `data/ids.json` / `content/modules/*.json` with real `OUT-*` ids from the Hub Outputs sheet, bump version, release v0.2.0, write the new DOI back.
4. Hub hygiene backlog (not blocking the Observatory): 0112/0245 Reliability, placeholder titles (0173, 0130–0133, 0139, 0149, 0165), ~50 legal records without Legal Status, 0318–0321 public fields (kept in Review on purpose).
5. Optional: `HUB_SHEET_ID` secret + link-readable Sheet for the Monday `hub-sync.yml` PR; Zenodo record type Software → Dataset.

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

- IDs: `ROAT-MOD-*` modules, `ROAT-SNAP-<MOD>-<date>` snapshots, `ROAT-JUR-*` jurisdictions (variants `ROAT-JUR-SK:1329`, `ROAT-JUR-UK:1861`), `RC-NNN` role concepts; all resolvable at `/id/<ID>/`. Registry: `data/ids.json`.
- Vocabularies: `data/vocabularies.json` (N0–N4 scale, role polarity, Hub publishable stages and evidence max).
- Windows: scripts resolve their own path with `fileURLToPath` (never `URL.pathname`); `serve.mjs` normalises URLs before `path.join`. Keep it that way.
- Language: repository, site and commit messages in English; conversation with the author in Slovak.
