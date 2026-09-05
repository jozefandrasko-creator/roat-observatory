# Release runbook

From a repository on disk to a public site with a DOI. Everything here is done once; after that a release is steps 5 to 7.

## 0. Before the first push

Check what you are about to make public. The repository is deliberately built so that `git status` answers this, but read it once with your own eyes:

```bash
node scripts/validate.mjs          # must exit 0
git status --porcelain             # hub-export/ and site/ must NOT appear
grep -r "ChatGPT\|Reviewed By" data/ | head    # should return nothing
```

`hub-export/` is git-ignored because the raw Intelligence Register carries internal notes, follow-ups and priorities. What the repository publishes from the Hub is only: the record index (id → stage, evidence level, legal status, public status, next check date), the Public Library rows, the public outputs, and the module snapshots. If you ever change `scripts/hub-sync.mjs`, re-read that list.

One decision to take before the first push: **public from day one, or private until v0.1**. Public is the better default — the repository is the audit trail, and a snapshot published from a private repository cannot be checked by anyone. Private is defensible only while a companion manuscript is under review and you want no trace of the coded data.

## 1. Create the repository

```bash
cd roat-observatory
git init -b main
git add .
git commit -m "ROAT Observatory: pipeline, modules 01-03 and 07, seven jurisdiction profiles"
gh repo create ROAT/roat-observatory --public --source=. --remote=origin --push
```

Without the `gh` CLI: create the repository in the GitHub web interface, then

```bash
git remote add origin https://github.com/<owner>/roat-observatory.git
git push -u origin main
```

## 2. Turn on Pages

Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow in `.github/workflows/build.yml` validates, builds with the project base path and deploys on every push to `main`. The site appears at `https://<owner>.github.io/roat-observatory/`.

A custom domain (section 13.1 of the architecture) replaces this later: add it in the same settings page and set `SITE_BASE=/` in the workflow.

## 3. Wire the Hub sync (optional but recommended)

Repository → Settings → Secrets and variables → Actions → New repository secret: `HUB_SHEET_ID` = `1G_jtoKunmcY0BTuTCEZBe21cMxiOH6fJdsduZRRKXGc`. The Sheet must be readable by link for `--from-url` to work; if you would rather not make it link-readable, skip this and keep exporting CSVs by hand into `hub-export/`.

`.github/workflows/hub-sync.yml` then runs every Monday at 05:00 UTC, before the weekly review, and opens a pull request when the export differs from what is committed. A changed score becomes a new snapshot only after a human completes `snapshot.json` — the workflow never publishes on its own.

## 4. Connect Zenodo

1. Sign in to Zenodo with GitHub, open **GitHub** in your account settings and switch the repository **on**. Do this *before* the first tag: Zenodo only archives releases created after the switch.
2. Zenodo reads `CITATION.cff`, so the author, licence and abstract come across without retyping.

## 5. Make a release

```bash
git tag -a v0.1.0 -m "Observatory v0.1: modules 01-03 and 07"
git push origin v0.1.0
gh release create v0.1.0 --title "ROAT Observatory v0.1" --notes-file CHANGELOG.md
```

Zenodo mints a concept DOI (all versions) and a version DOI (this release) within a few minutes.

## 6. Write the DOI back

The snapshot files carry `"doi": null` until a release exists. After the release, put the **version** DOI into every snapshot the release contains, commit, and push:

```bash
# data/modules/<slug>/<date>/snapshot.json
"doi": "10.5281/zenodo.XXXXXXX"
```

The module pages then show the DOI in their header and in the "Cite this snapshot" block, and the changelog page fills its DOI column. This is the step that makes a snapshot citable rather than merely public.

## 7. Announce what the release actually contains

A release note that says "v0.1" tells a reader nothing about evidentiary state. Say, in three lines: which modules are published and which are draft; the snapshot date of each; and what is pending. As of this writing that reads:

- Module 01 layered normalisation — snapshot 2026-08-25, status review; plus the longitudinal panel (UK 1861-1930, EU/UNECE 2018-2026, GB 2024-2026), draft.
- Module 02 Second Gate — snapshot 2026-08-31, status review.
- Module 03 human roles — snapshot 2026-09-05, draft; 19 of 30 rows published, 11 pending evidence.
- Module 07 regulatory method — published; no companion manuscript, so no embargo.
- Source Library — empty until the Public Editorial Queue is run; identifiers on module pages will not resolve until then.

## Windows routine (PowerShell), step by step

Everything below runs in the repository folder (`C:\Users\jozef\Desktop\roat-observatory`): open it in Explorer, right-click an empty spot, **Open in Terminal**. One-time setup was `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`; Node ≥ 20 and Git for Windows are installed.

1. **Export the Hub.** In Google Sheets open each sheet the Observatory reads and use File → Download → Comma-separated values (.csv). Google names the file `ROAT Intelligence Hub – Final - <Sheet name>.csv`; keep that name. Move all files into the `hub-export` folder inside the repository (create it once; it is git-ignored, nothing in it is ever committed). Sheets needed: Intelligence Register, Public Library, Outputs, Cross-section 2026 – AV Normalisation, Post-Type-Approval Deployment Models, Roles & Concepts, Role Function Matrix, Layer Coding – AV History, ROAT Regulatory Method.
2. **Sync.** `npm run sync` — or, when only one module changed, `node scripts/hub-sync.mjs --module=second-gate --snapshot-date=2026-10-15`. A new snapshot date creates a new folder under `data\modules\<slug>\<date>\` with a skeleton `snapshot.json`; an existing folder is overwritten with the current export (a published snapshot must never be re-synced — its data is frozen).
3. **Complete `snapshot.json`** for the new date in Notepad: `coder`, `second_pass`, `finding`, `caveats`, `supersedes` (the previous snapshot's `roat_id`), `status` (`draft` → `review` → `published`). `doi` stays `null` until step 8.
4. **Check.** `npm run validate` must end with `0 errors`; then `npm run build`, `npm run serve`, look at http://localhost:8080, Ctrl+C.
5. **Commit and push.** `git add .` then `git status --porcelain | Select-String "hub-export|site/"` (must print nothing), then `git commit -m "Snapshot second-gate 2026-10-15"` and `git push`. GitHub Actions rebuilds the site in about half a minute.
6. **Release** (only when a snapshot reached `published`, or the code changed in a way worth citing): bump `version` in `package.json` and `CITATION.cff`, add a heading to `CHANGELOG.md`, commit, push; then GitHub → Releases → Draft a new release → tag `v0.2.0`, title, notes → Publish.
7. **Wait for Zenodo** (a few minutes) and read the version DOI at https://zenodo.org/account/settings/github/repository/jozefandrasko-creator/roat-observatory.
8. **Write the DOI back** into every snapshot the release contains (`"doi": "10.5281/zenodo.NNNNNNNN"` — the version DOI, not the concept DOI `10.5281/zenodo.22409313`), commit, push.

Rule of thumb: steps 1–5 are a normal week; steps 6–8 happen only when something becomes citable.

## Recurring release

Every later release is: freeze a snapshot in the Hub → `npm run sync` → complete `snapshot.json` → `npm run validate` → commit and push → tag → write the DOI back. The embargo rule from section 9.3 of the architecture decides *when*: a module snapshot is published after its companion manuscript has been submitted, not before.
