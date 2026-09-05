#!/usr/bin/env node
// validate — the Observatory build gates (Architecture v0.2 §9.5).
// Exit 1 on any ERROR. Warnings never block. `--report` also writes data/validation-report.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and resolves to "C:\\C:\\..."
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const exists = p => fs.existsSync(path.join(ROOT, p));
const errors = [], warnings = [];
const err = (where, msg) => errors.push({ where, msg });
const warn = (where, msg) => warnings.push({ where, msg });

const ids = J("data/ids.json");
const vocab = J("data/vocabularies.json");
const index = J("data/hub/register-index.json").records;
const outputs = J("data/hub/outputs.json").outputs;
const outputIds = new Set(outputs.map(o => o.id));
const levelNum = s => { const m = String(s || "").match(/Level (\d)/); return m ? Number(m[1]) : null; };

/* ---- registry ↔ content ---- */
for (const [id, m] of Object.entries(ids.modules)) {
  if (!exists(`content/modules/${m.slug}.json`)) err(id, `registry entry has no content/modules/${m.slug}.json`);
}
for (const [id, j] of Object.entries(ids.jurisdictions)) {
  if (j.profile !== false && !exists(`content/jurisdictions/${j.slug}.json`)) err(id, `jurisdiction registered but no content/jurisdictions/${j.slug}.json`);
}
const modFiles = fs.readdirSync(path.join(ROOT, "content/modules")).filter(f => f.endsWith(".json"));
for (const f of modFiles) {
  const m = J(`content/modules/${f}`);
  if (!ids.modules[m.roat_id]) err(m.slug, `module ${m.roat_id} is not in data/ids.json`);
  if (ids.modules[m.roat_id] && ids.modules[m.roat_id].slug !== m.slug) err(m.slug, `slug differs from registry`);
  for (const k of ["roat_id", "slug", "number", "title", "question", "method_summary", "hub", "dimensions", "row_fields", "status"]) if (m[k] == null) err(m.slug, `module metadata missing "${k}"`);
  for (const t of m.relationships?.companion_of || []) if (!outputIds.has(t) && !ids.external_outputs_pending?.[t]) err(m.slug, `companion_of target ${t} is neither a Hub OUT-* id nor a registered placeholder`);
  for (const t of m.relationships?.related_module || []) if (!ids.modules[t]) err(m.slug, `related_module target ${t} not registered`);
  if (ids.external_outputs_pending && (m.relationships?.companion_of || []).some(t => ids.external_outputs_pending[t])) warn(m.slug, `companion output is a placeholder — assign an OUT-* id in the Hub Outputs sheet`);
}

/* ---- snapshots ---- */
const regimeKnown = id => { const m = id.match(/^(ROAT-JUR-[A-Z]+):\d{4}$/); return !!(ids.jurisdictions[id] || ids.regime_variants[id] || /^RC-\d{3}$/.test(id) || (m && ids.jurisdictions[m[1]])); };
for (const f of modFiles) {
  const m = J(`content/modules/${f}`);
  const dir = path.join(ROOT, "data/modules", m.slug);
  if (!fs.existsSync(dir)) { (m.status === "published" ? err : warn)(m.slug, "no snapshot directory"); continue; }
  const dates = fs.readdirSync(dir).filter(d => /^\d{4}-\d{2}-\d{2}$|^historical-/.test(d)).sort();
  if (!dates.length) { (m.status === "published" ? err : warn)(m.slug, "no snapshots"); continue; }
  for (const d of dates) {
    const where = `${m.slug}/${d}`;
    const sp = path.join(dir, d, "snapshot.json"), dp = path.join(dir, d, "data.json");
    if (!fs.existsSync(sp) || !fs.existsSync(dp)) { err(where, "snapshot.json or data.json missing"); continue; }
    const snap = JSON.parse(fs.readFileSync(sp, "utf8")), data = JSON.parse(fs.readFileSync(dp, "utf8"));
    // A draft snapshot never blocks the build (it renders with a banner); its gate failures are reported as warnings.
    const err = snap.status === "draft" ? (w, m) => warn(w, `[draft] ${m}`) : (w, m) => errors.push({ where: w, msg: m });
    if (snap.module !== m.roat_id) err(where, `snapshot.module ${snap.module} ≠ ${m.roat_id}`);
    if (!/^ROAT-SNAP-/.test(snap.roat_id || "")) err(where, "snapshot roat_id missing or malformed");
    if (snap.status === "published") {
      if (!snap.coder) err(where, "published snapshot has no coder");
      if (!snap.snapshot_date) err(where, "published snapshot has no snapshot_date");
      if (!snap.second_pass) warn(where, "published snapshot has no second_pass statement");
      if (!snap.doi) warn(where, "published snapshot has no DOI yet");
    }
    if (m.status === "published" && snap.status !== "published" && d === dates[dates.length - 1]) warn(where, `latest snapshot status is "${snap.status}" — module page will show a draft banner`);
    // method modules carry no jurisdiction claims: no per-row evidence, but module-level sources are gated
    if (m.kind === "method") {
      if (!(m.sources || []).length) err(where, "a method module must cite the sources its framework rests on");
      for (const id of m.sources || []) {
        const rec = index[id];
        if (!rec) { err(where, `module source ${id} not in Hub register index`); continue; }
        if (!vocab.hub.publishable_stages.includes(rec.stage)) err(where, `module source ${id} is at Research Stage "${rec.stage}"`);
        if (rec.public_status !== "Published") warn(where, `module source ${id} is not Published in the Public Library`);
      }
      for (const r of data.rows) {
        if (!String(r.question || "").trim()) err(`${where} · stage ${r.number}`, "no core question");
        if (!String(r.operationalisation || "").trim()) err(`${where} · stage ${r.number}`, "no ROAT operationalisation");
      }
      continue;
    }
    // rows
    const dimKeys = m.dimensions.map(x => x.key);
    for (const r of data.rows) {
      const rw = `${where} · ${r.regime_label}`;
      if (!regimeKnown(r.regime_id)) err(rw, `regime "${r.regime_id}" is not a registered jurisdiction, variant or RC id`);
      for (const dm of m.dimensions) {
        const v = r[dm.key];
        if (dm.scale === "n-scale" && (v === null || v === undefined || v < 0 || v > 4)) err(rw, `dimension ${dm.key}: not an N0–N4 value (${v})`);
        if (dm.scale === "text" && r.panel !== "prospective" && !String(v || "").trim()) err(rw, `dimension ${dm.key}: empty`);
        if (dm.scale === "role-value" && !String(v || "").trim()) warn(rw, `dimension ${dm.key}: empty — a role-function cell should state the value even when it is a plain No`);
      }
      if (r.panel !== "prospective" || m.hub.profile !== "cross-section") {
        if (!String(r.rationale || "").trim()) err(rw, "no rationale / analytical note");
        if (m.row_fields.confidence && !String(r.confidence || "").trim()) err(rw, "no confidence value");
        if (m.row_fields.confidence && r.confidence && !vocab.confidence.includes(r.confidence) && !/^High|^Medium|^Low/.test(r.confidence)) err(rw, `confidence "${String(r.confidence).slice(0, 60)}…" is not a confidence value — check column alignment in the Hub sheet`);
        if (!r.records?.length && r.panel !== "prospective") err(rw, "no core ROAT records");
      }
      const partial = m.evidence_policy === "publish-evidenced-rows";
      let passing = 0;
      for (const id of r.records || []) {
        const rec = index[id];
        if (!rec) { err(rw, `record ${id} not in Hub register index`); continue; }
        const stageOk = vocab.hub.publishable_stages.includes(rec.stage);
        const lv = levelNum(rec.evidence_level);
        const levelOk = !lv || lv <= vocab.hub.evidence_level_max_for_cell;
        if (stageOk && levelOk) passing++;
        else if (partial) warn(rw, `record ${id} is below the evidence gate (${rec.stage}, ${rec.evidence_level}) — omitted from this row's sources`);
        else {
          if (!stageOk) err(rw, `record ${id} is at Research Stage "${rec.stage}" — cannot support a cell`);
          if (!levelOk) err(rw, `record ${id} is ${rec.evidence_level} — cannot support a cell`);
        }
        if (rec.public_status !== "Published") warn(rw, `record ${id} is not Published in the Public Library (source page will not exist)`);
      }
      if (partial && (r.records || []).length && passing === 0) warn(rw, `no publishable evidence — the row is listed as pending, not published as coded`);
    }
  }
}

/* ---- jurisdictions ---- */
for (const f of fs.readdirSync(path.join(ROOT, "content/jurisdictions")).filter(f => f.endsWith(".json"))) {
  const j = J(`content/jurisdictions/${f}`);
  if (!ids.jurisdictions[j.roat_id]) err(j.slug, `jurisdiction ${j.roat_id} not registered`);
  if (!j.last_verified || !/^\d{4}-\d{2}-\d{2}$/.test(j.last_verified)) err(j.slug, "last_verified missing or not ISO");
  if (!exists(`content/jurisdictions/${j.slug}.md`)) err(j.slug, "overview paragraph (.md) missing");
  else { const w = fs.readFileSync(path.join(ROOT, `content/jurisdictions/${j.slug}.md`), "utf8").split(/\s+/).filter(Boolean).length; if (w > 140) warn(j.slug, `overview is ${w} words (limit 120)`); }
}

/* ---- source library ---- */
for (const src of J("data/hub/sources.json").sources) {
  const where = `source ${src.id}`;
  if (!String(src.title || "").trim()) err(where, "published source has no title");
  if (!String(src.official_source || src.doi || "").trim()) err(where, "published source has neither an official source URL nor a DOI");
  for (const k of ["summary", "citation", "category", "publication_date"]) if (!String(src[k] || "").trim()) warn(where, `published source has no ${k.replace("_", " ")}`);
  if (/^(Legal act|Draft legislation|Official guidance|Policy document|Standard)$/.test(src.record_type || "") && !String(src.legal_status || "").trim()) warn(where, "legal instrument without legal status");
}

/* ---- report ---- */
const dedupe = a => { const s = new Set(); return a.filter(x => { const k = x.where + "|" + x.msg; if (s.has(k)) return false; s.add(k); return true; }); };
const E = dedupe(errors), W = dedupe(warnings);
const lines = [];
lines.push(`# Observatory validation — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, "", `**${E.length} errors · ${W.length} warnings**`, "");
if (E.length) { lines.push("## Errors (block the build)", ""); for (const e of E) lines.push(`- **${e.where}** — ${e.msg}`); lines.push(""); }
if (W.length) { lines.push("## Warnings", ""); for (const w of W) lines.push(`- ${w.where} — ${w.msg}`); lines.push(""); }
const report = lines.join("\n");
console.log(report);
if (process.argv.includes("--report")) fs.writeFileSync(path.join(ROOT, "data/validation-report.md"), report + "\n");
process.exit(E.length ? 1 : 0);
