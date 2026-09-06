#!/usr/bin/env node
// hub-sync — read ROAT Intelligence Hub exports and write Observatory data files.
// Read-only towards the Hub. Never writes to the Sheet.
//
// Sources (in this order):
//   --from-url   fetch each sheet as CSV from Google Sheets (requires HUB_SHEET_ID and the
//                spreadsheet shared "anyone with the link can view"):
//                https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<name>
//   default      read hub-export/<Sheet name>.csv — Google's download name
//                "ROAT Intelligence Hub – Final - <Sheet name>.csv" is accepted as is (File → Download → CSV per sheet)
//
// Output:
//   data/hub/register-index.json   id → stage, evidence level, legal status, public status, next check (public-safe)
//   data/hub/sources.json          Source Library: Public Library sheet rows, or — when that sheet is empty —
//                                  Register rows with Public Status = Published (public columns only)
//   data/hub/outputs.json          Outputs sheet, public-safe columns
//   data/modules/<slug>/<date>/data.json, data.csv, snapshot.json (skeleton, never overwritten)
//
// Options: --snapshot-date=YYYY-MM-DD (default: today) --module=<slug> (only that module)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV, toCSV, tableAt, findRow } from "./lib/csv.mjs";

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and resolves to "C:\\C:\\..."
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const today = new Date().toISOString().slice(0, 10);
const snapshotDate = args["snapshot-date"] || today;
const onlyModule = args.module || null;

async function readSheet(name) {
  if (args["from-url"]) {
    const id = process.env.HUB_SHEET_ID;
    if (!id) throw new Error("HUB_SHEET_ID is not set");
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Hub fetch failed for sheet "${name}": ${res.status}`);
    return parseCSV(await res.text());
  }
  const dir = path.join(ROOT, "hub-export");
  let file = path.join(dir, `${name}.csv`);
  if (!fs.existsSync(file)) {
    // tolerate truncated sheet names (xlsx exports cut names at 31 chars) and Google's own
    // download naming "<Spreadsheet name> - <Sheet name>.csv" (File → Download → CSV, per sheet)
    const ok = b => b === name || name.startsWith(b) || b.startsWith(name.slice(0, 28)) || b.endsWith(" - " + name) || b.endsWith("- " + name);
    const cand = fs.existsSync(dir) ? fs.readdirSync(dir).find(f => f.endsWith(".csv") && ok(f.slice(0, -4))) : null;
    if (!cand) throw new Error(`No export for sheet "${name}" in hub-export/`);
    file = path.join(dir, cand);
  }
  return parseCSV(fs.readFileSync(file, "utf8"));
}

const splitIds = s => String(s || "").split(/[;,]/).map(x => x.trim()).filter(Boolean).map(x => /^\d{4}$/.test(x) ? `ROAT-2026-${x}` : x);
const writeJSON = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1) + "\n"); };
const log = (...a) => console.log("[hub-sync]", ...a);

/* ---------- Hub-wide exports ---------- */
async function syncRegister() {
  const rows = await readSheet("Intelligence Register");
  const hdr = findRow(rows, r => r[0] === "Record ID");
  const { rows: recs } = tableAt(rows, hdr, { stopAtBlank: false });
  const index = {};
  for (const r of recs) {
    if (!/^ROAT-\d{4}-\d{4}$/.test(r["Record ID"])) continue;
    index[r["Record ID"]] = {
      stage: r["Research Stage"], evidence_level: r["Evidence Level"], reliability: r["Reliability"],
      legal_status: r["Legal Status"], public_status: r["Public Status"], record_type: r["Record Type"],
      next_check: r["Next Check Date"], jurisdiction: r["Jurisdiction"]
    };
  }
  writeJSON(path.join(ROOT, "data/hub/register-index.json"), { exported: new Date().toISOString(), count: Object.keys(index).length, records: index });
  log(`register index: ${Object.keys(index).length} records`);
  return index;
}
async function syncSources() {
  // Source Library = Public Library sheet when it carries rows; otherwise derived from the Register's
  // public columns (51–63) for records whose Public Status is Published. Only public-safe fields are
  // taken from the Register — never Notes, Follow-up, AI Insight, Reviewed By or the workflow columns.
  const rows = await readSheet("Public Library");
  const hdr = findRow(rows, r => r[0] === "Record ID");
  const { rows: recs } = hdr >= 0 ? tableAt(rows, hdr, { stopAtBlank: false }) : { rows: [] };
  let sources = recs.filter(r => /^ROAT-/.test(r["Record ID"])).map(r => ({
    id: r["Record ID"], category: r["Public Category"], title: r["Title"], org: r["Author / Organisation"],
    jurisdiction: r["Jurisdiction"], record_type: r["Record Type"], topic: r["Main Topic"], impact_area: r["Impact Area"],
    publication_date: r["Publication Date"], legal_status: r["Legal Status"], effective_from: r["Effective From"],
    language: r["Language"], open_access: r["Open Access"], summary: r["Summary"], why_it_matters: r["Why This Source Matters"],
    keywords: r["Keywords"], citation: r["Citation"], official_source: r["Official Source"], doi: r["DOI / ISBN"],
    last_verified: r["Last Verified"], featured: r["Featured"], display_order: r["Display Order"]
  }));
  let from = "Public Library sheet";
  if (!sources.length) {
    from = "Register (Public Status = Published)";
    const reg = await readSheet("Intelligence Register");
    const rh = findRow(reg, r => r[0] === "Record ID");
    const { rows: rr } = tableAt(reg, rh, { stopAtBlank: false });
    const t = v => String(v ?? "").trim();
    sources = rr.filter(r => /^ROAT-\d{4}-\d{4}$/.test(r["Record ID"]) && t(r["Public Status"]) === "Published").map(r => ({
      id: r["Record ID"], category: t(r["Public Category"]), title: t(r["Public Title"]) || t(r["Title"]),
      org: [t(r["Author"]), t(r["Organisation"])].filter(Boolean).join(" · "),
      jurisdiction: t(r["Jurisdiction"]), record_type: t(r["Record Type"]), topic: t(r["Main Topic"]), impact_area: t(r["Impact Area"]),
      publication_date: t(r["Publication Date"]), legal_status: t(r["Legal Status"]), effective_from: t(r["Effective From"]),
      language: t(r["Language"]), open_access: t(r["Open Access"]), summary: t(r["Public Summary"]), why_it_matters: t(r["Why This Source Matters"]),
      keywords: t(r["Keywords"]), citation: t(r["Citation"]), official_source: t(r["Primary Source URL"]) || t(r["URL"]), doi: t(r["DOI / ISBN"]),
      last_verified: t(r["Date Reviewed"]), featured: t(r["Featured"]), display_order: t(r["Display Order"])
    }));
  }
  writeJSON(path.join(ROOT, "data/hub/sources.json"), { exported: new Date().toISOString(), from, count: sources.length, sources });
  log(`sources (${from}): ${sources.length}`);
  return sources;
}
async function syncOutputs() {
  const rows = await readSheet("Outputs");
  const hdr = findRow(rows, r => r[0] === "Output ID");
  const { rows: recs } = tableAt(rows, hdr, { stopAtBlank: false });
  const allow = JSON.parse(fs.readFileSync(path.join(ROOT, "content/research.json"), "utf8")).public_outputs;
  const outputs = recs.filter(r => /^OUT-/.test(r["Output ID"])).map(r => ({
    id: r["Output ID"], type: r["Type"], title: r["Title"], project: r["Related Project"], status: r["Status"],
    url: r["URL"], description: r["Description"], source_records: splitIds(r["Source Record IDs"]), public: allow.includes(r["Output ID"])
  }));
  writeJSON(path.join(ROOT, "data/hub/outputs.json"), { exported: new Date().toISOString(), count: outputs.length, outputs });
  log(`outputs: ${outputs.length} (${outputs.filter(o => o.public).length} public)`);
  return outputs;
}

/* ---------- Regulatory Map (optional sheet) ----------
   The landscape map lives in content/landscape/<date>.json until the classification is carried in the Hub.
   Once a "Regulatory Map" sheet exists, this writes data/hub/landscape.json and the build prefers it. */
async function syncLandscape() {
  let rows;
  try { rows = await readSheet("Regulatory Map"); }
  catch { log("landscape: no Regulatory Map sheet — the build keeps using content/landscape/"); return null; }
  const hdr = findRow(rows, r => r[0] === "Box ID");
  if (hdr < 0) { log("landscape: Regulatory Map sheet has no \"Box ID\" header — skipped"); return null; }
  const { rows: recs } = tableAt(rows, hdr, { stopAtBlank: false });
  const yes = v => /^(yes|true|1|áno)$/i.test(String(v || "").trim());
  const boxes = recs.filter(r => /^BOX-/.test(r["Box ID"])).map(r => ({
    id: r["Box ID"].trim(), pillar: (r["Pillar"] || "").trim(), label: (r["Display label"] || "").trim(),
    layer: (r["Layer"] || "").trim(), function: (r["Function"] || "").trim(), status: (r["Status"] || "").trim(),
    backbone: yes(r["Backbone"]), new_2026: yes(r["NEW 2026"]),
    records: splitIds(r["ROAT Record IDs"]).filter(s => /^ROAT-\d{4}-\d{4}$/.test(s)),
    urls: String(r["Official source URL(s)"] || "").split(/\s+/).filter(u => /^https?:\/\//.test(u)),
    note: (r["Editorial note"] || "").trim()
  }));
  const uniq = a => [...new Set(a)];
  writeJSON(path.join(ROOT, "data/hub/landscape.json"), {
    exported: new Date().toISOString(), source: "ROAT Intelligence Hub, sheet \"Regulatory Map\"",
    pillars: uniq(boxes.map(b => b.pillar)), layers: uniq(boxes.map(b => b.layer)), statuses: uniq(boxes.map(b => b.status)), boxes
  });
  log(`landscape: ${boxes.length} boxes across ${uniq(boxes.map(b => b.pillar)).length} pillars`);
  return boxes;
}

/* ---------- Module profiles ---------- */
const nScore = v => { const m = String(v).trim().match(/^N?([0-4])$/); return m ? Number(m[1]) : null; };

function rowBase(mod, r) {
  const f = mod.row_fields;
  const label = r[f.label];
  return {
    regime_id: mod.regimes[label] || (f.id ? r[f.id] : null) || label,
    regime_label: label,
    records: splitIds(r[f.records]),
    rationale: f.rationale ? r[f.rationale] : "",
    confidence: f.confidence ? r[f.confidence] : ""
  };
}
function dims(mod, r) {
  const o = {};
  for (const d of mod.dimensions) {
    const v = r[d.column];
    o[d.key] = d.scale === "n-scale" ? nScore(v) : (v ?? "");
  }
  return o;
}

function profileCrossSection(mod, rows) {
  const f = mod.row_fields;
  const hdr = findRow(rows, r => r[0] === f.label);
  const cur = tableAt(rows, hdr, { stopWhen: l => /^(Sensitivity|Pathway|Cross-sectional)/.test(l[0] || "") }).rows.map(r => ({ ...rowBase(mod, r), panel: "current", ...dims(mod, r),
    range: Number(r[f.range]), asynchrony: r[f.asynchrony], family: r[f.family], bridge: r[f.bridge],
    sensitivity: r[f.sensitivity], robust_conclusion: r[f.robust], caveat: r[f.caveat] }));
  const sHdr = findRow(rows, r => /^Sensitivity/.test(r[0] || ""));
  const prosp = sHdr >= 0 ? tableAt(rows, sHdr).rows.map(r => {
    const o = { regime_label: r[Object.keys(r)[0]], panel: "prospective", ...dims(mod, r), result: r["Result"], interpretation: r["Interpretation"], records: [], rationale: r["Interpretation"], confidence: "" };
    o.regime_id = mod.regimes[o.regime_label] || o.regime_label; return o;
  }) : [];
  const pHdr = findRow(rows, r => r[0] === "Pathway");
  const pathways = pHdr >= 0 ? tableAt(rows, pHdr).rows.map(r => ({ pathway: r["Pathway"], pattern: r["Diagnostic pattern"], case: r["2026 case"], value: r["Analytical value"] })) : [];
  const findings = {};
  for (const k of ["Cross-sectional finding", "Novelty implication", "Next empirical step"]) { const i = findRow(rows, r => r[0] === k); if (i >= 0) findings[k] = rows[i][1]; }
  const aHdr = findRow(rows, r => r[0] === "Cell audited");
  const audit = aHdr >= 0 ? tableAt(rows, aHdr).rows.map(r => ({ cell: r["Cell audited"], first: r["First-pass score"], rule: r["Strict decision rule"], second: r["Second-pass score"], change: r["Change"], effect: r["Effect on pathway"] })) : [];
  const ar = findRow(rows, r => r[0] === "Audit result");
  const purpose = rows.slice(0, hdr).map(r => r[0]).filter(Boolean);
  const dateM = purpose.join(" ").match(/snapshot:\s*([0-9]{1,2} \w+ [0-9]{4})/i);
  return { rows: [...cur, ...prosp], extras: { pathways, findings, audit, audit_result: ar >= 0 ? rows[ar].slice(1).filter(Boolean) : [], purpose }, sheetDate: dateM ? dateM[1] : null };
}

function profileSingleTable(mod, rows, joinRows) {
  const hdrIdx = mod.hub.header_row ?? findRow(rows, r => r[0] === mod.row_fields.label || r[0] === mod.row_fields.id);
  const { rows: recs } = tableAt(rows, hdrIdx);
  let joined = {};
  if (joinRows) {
    const jHdr = mod.hub.join.header_row ?? findRow(joinRows, r => r[0] === mod.hub.join.key);
    for (const r of tableAt(joinRows, jHdr).rows) joined[r[mod.hub.join.key]] = r;
  }
  const f = mod.row_fields;
  const out = recs.map(r => {
    const j = joinRows ? (joined[r[f.id]] || {}) : {};
    const merged = { ...j, ...r };
    const base = rowBase(mod, merged);
    const o = { ...base, panel: /draft|prospective|proposed/i.test(base.regime_label) ? "prospective" : "current", ...dims(mod, merged) };
    if (f.term) o.term = merged[f.term]; if (f.framework) o.framework = merged[f.framework]; if (f.verification) o.verification = merged[f.verification];
    if (f.extra) { o.extra = {}; for (const k of f.extra) if (merged[k]) o.extra[k] = merged[k]; }
    return o;
  });
  const purpose = rows.slice(0, hdrIdx).flat().filter(Boolean);
  const dateM = purpose.join(" ").match(/Snapshot:\s*([0-9]{1,2} \w+ [0-9]{4})/i);
  return { rows: out, extras: { purpose }, sheetDate: dateM ? dateM[1] : null };
}

function profileLongitudinal(mod, ex, rows) {
  const f = ex.row_fields;
  const hdr = ex.header_row ?? findRow(rows, r => r[0] === f.panel);
  const { rows: recs } = tableAt(rows, hdr, { stopAtBlank: false, stopWhen: l => l[0] === ex.stop_at });
  const dimsEx = mod.dimensions.map(d => ({ ...d, column: ex.column_aliases?.[d.key] || d.column }));
  const out = recs.map(r => {
    const year = String(r[f.year]).replace(/\.0$/, "");
    const base = ex.panel_map[r[f.panel]] || r[f.panel];
    const o = { regime_id: `${base}:${year}`, regime_label: `${year} · ${r[f.label]}`, panel: Number(year) < 2000 ? "historical" : "longitudinal",
      series: r[f.panel], year: Number(year), records: splitIds(r[f.records]), rationale: r[f.rationale], confidence: r[f.confidence],
      range: Number(r[f.range]), asynchrony: r[f.asynchrony], bridge: r[f.bridge], caveat: r[f.caveat] };
    for (const d of dimsEx) o[d.key] = d.scale === "n-scale" ? nScore(r[d.column]) : (r[d.column] ?? "");
    return o;
  });
  const fi = findRow(rows, r => r[0] === ex.findings_table?.header);
  const findings_table = fi >= 0 ? tableAt(rows, fi).rows : [];
  return { rows: out, extras: { findings_table, purpose: rows.slice(0, hdr).map(r => r[0]).filter(Boolean) }, sheetDate: null };
}

async function syncExtraSnapshot(mod, ex) {
  const rows = await readSheet(ex.sheet);
  const parsed = profileLongitudinal(mod, ex, rows);
  const dir = path.join(ROOT, "data/modules", mod.slug, ex.dir);
  fs.mkdirSync(dir, { recursive: true });
  const data = { module: mod.roat_id, snapshot_date: snapshotDate, panel: ex.dir, exported_from_hub: new Date().toISOString(), source_sheet: ex.sheet, rows: parsed.rows, ...parsed.extras };
  writeJSON(path.join(dir, "data.json"), data);
  if (mod.kind === "method") {
    const cols2 = ["number", "title", "question", "basis", "operationalisation", "asset", "output", "checks", "rule", "source"];
    fs.writeFileSync(path.join(dir, "data.csv"), toCSV([cols2, ...parsed.rows.map(r => cols2.map(c => r[c] ?? ""))]));
    writeSnapshotSkeleton(mod, dir, date, parsed);
    log(`${mod.slug}: ${parsed.rows.length} stages → data/modules/${mod.slug}/${date}/`);
    return;
  }
  const cols = ["regime_id", "regime_label", "panel", "series", "year", ...mod.dimensions.map(d => d.key), "range", "asynchrony", "bridge", "rationale", "confidence", "caveat", "records"];
  fs.writeFileSync(path.join(dir, "data.csv"), toCSV([cols, ...parsed.rows.map(r => cols.map(c => c === "records" ? r.records.join(";") : (r[c] ?? "")))]));
  const snapFile = path.join(dir, "snapshot.json");
  if (!fs.existsSync(snapFile)) writeJSON(snapFile, { roat_id: `ROAT-SNAP-${mod.roat_id.replace("ROAT-MOD-", "")}-${ex.dir.toUpperCase()}`, module: mod.roat_id, panel: ex.dir, label: ex.label, snapshot_date: snapshotDate, coder: "", second_pass: "", finding: "", caveats: [], supersedes: null, doi: null, status: "draft" });
  log(`${mod.slug}/${ex.dir}: ${parsed.rows.length} rows`);
}

function profileStages(mod, rows) {
  const hdr = mod.hub.header_row ?? findRow(rows, r => r[0] === "Stage");
  const { rows: recs } = tableAt(rows, hdr, { stopAtBlank: false, stopWhen: l => l[0] === mod.hub.verdict_from });
  const keyOf = h => ({ "Stage": "stage", "Core question": "question", "Leenes / TechReg basis": "basis",
    "ROAT operationalisation": "operationalisation", "Existing ROAT asset": "asset", "Required output": "output",
    "AV-specific checks": "checks", "Decision rule / caveat": "rule", "Source / reference": "source" })[h] || h;
  const stages = recs.map(r => {
    const o = {}; for (const k of Object.keys(r)) o[keyOf(k)] = r[k];
    const m = String(o.stage || "").match(/^(\d+)\.\s*(.*)$/);
    o.number = m ? Number(m[1]) : null; o.title = m ? m[2] : o.stage;
    return o;
  }).filter(o => o.number);
  const vi = findRow(rows, r => r[0] === mod.hub.verdict_from);
  const verdict = vi >= 0 ? tableAt(rows, hdr, { stopAtBlank: false }).rows
    .filter(r => !/^\d+\./.test(String(r["Stage"] || "")) && String(r["Stage"] || "").trim())
    .filter(r => ["Core question", "Leenes / TechReg basis", "ROAT operationalisation"].some(k => String(r[k] || "").trim()))   // skip the section heading row
    .map(r => ({ label: r["Stage"], what: r["Core question"], why: r["Leenes / TechReg basis"],
                 how: r["ROAT operationalisation"], asset: r["Existing ROAT asset"], caveat: r["Decision rule / caveat"] })) : [];
  const intro = rows.slice(0, hdr).map(r => r[0]).filter(Boolean);
  return { rows: stages, extras: { verdict, intro }, sheetDate: null };
}

function isoFromSheetDate(s) {
  if (!s) return null;
  const d = new Date(s + " UTC"); return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

async function syncModule(mod) {
  const rows = await readSheet(mod.hub.sheet);
  let parsed;
  if (mod.hub.profile === "cross-section") parsed = profileCrossSection(mod, rows);
  else if (mod.hub.profile === "stages") parsed = profileStages(mod, rows);
  else if (mod.hub.profile === "single-table") parsed = profileSingleTable(mod, rows, mod.hub.join ? await readSheet(mod.hub.join.sheet) : null);
  else throw new Error(`Unknown profile ${mod.hub.profile} for ${mod.slug}`);

  // An explicit --snapshot-date wins over the "Snapshot: <date>" line in the sheet, so a re-sync after
  // a recoding never overwrites the frozen folder named in the sheet (CLAUDE.md hard rule 3).
  const date = args["snapshot-date"] || isoFromSheetDate(parsed.sheetDate) || snapshotDate;
  const dir = path.join(ROOT, "data/modules", mod.slug, date);
  fs.mkdirSync(dir, { recursive: true });
  const data = { module: mod.roat_id, snapshot_date: date, exported_from_hub: new Date().toISOString(), source_sheet: mod.hub.sheet, rows: parsed.rows, ...parsed.extras };
  writeJSON(path.join(dir, "data.json"), data);
  if (mod.kind === "method") {
    const cols2 = ["number", "title", "question", "basis", "operationalisation", "asset", "output", "checks", "rule", "source"];
    fs.writeFileSync(path.join(dir, "data.csv"), toCSV([cols2, ...parsed.rows.map(r => cols2.map(c => r[c] ?? ""))]));
    writeSnapshotSkeleton(mod, dir, date, parsed);
    log(`${mod.slug}: ${parsed.rows.length} stages → data/modules/${mod.slug}/${date}/`);
    return;
  }
  const cols = ["regime_id", "regime_label", "panel", ...mod.dimensions.map(d => d.key), ...Object.keys(parsed.rows[0] || {}).filter(k => !["regime_id", "regime_label", "panel", "records", "extra"].includes(k) && !mod.dimensions.some(d => d.key === k)), "records"];
  fs.writeFileSync(path.join(dir, "data.csv"), toCSV([cols, ...parsed.rows.map(r => cols.map(c => c === "records" ? r.records.join(";") : (r[c] ?? "")))]));
  writeSnapshotSkeleton(mod, dir, date, parsed);
  log(`${mod.slug}: ${parsed.rows.length} rows → data/modules/${mod.slug}/${date}/`);
  for (const ex of mod.extra_snapshots || []) await syncExtraSnapshot(mod, ex);
}

function writeSnapshotSkeleton(mod, dir, date, parsed) {
  const snapFile = path.join(dir, "snapshot.json");
  if (!fs.existsSync(snapFile)) {
    writeJSON(snapFile, {
      roat_id: `ROAT-SNAP-${mod.roat_id.replace("ROAT-MOD-", "")}-${date}`,
      module: mod.roat_id, snapshot_date: date, coder: "", second_pass: "", finding: parsed.extras?.findings?.["Cross-sectional finding"] || "",
      caveats: [], supersedes: null, doi: null, status: mod.status === "published" ? "review" : "draft",
      note: "Skeleton written by hub-sync. Complete coder, second_pass, caveats and status; the build refuses a published snapshot with an empty coder."
    });
    log(`${mod.slug}: new snapshot skeleton ${date} — complete snapshot.json`);
  }
}

/* ---------- main ---------- */
const modules = fs.readdirSync(path.join(ROOT, "content/modules")).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(ROOT, "content/modules", f), "utf8")));
await syncRegister(); await syncSources(); await syncOutputs(); await syncLandscape();
for (const m of modules) { if (onlyModule && m.slug !== onlyModule) continue; await syncModule(m); }
log("done");
