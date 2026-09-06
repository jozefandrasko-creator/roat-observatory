#!/usr/bin/env node
// build — generate the static site into site/ from content/ and data/.
// `npm run build` runs validate first; `--draft` skips gates and stamps every page with a draft banner.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { md, splitFront } from "./lib/md.mjs";
import * as T from "../src/templates.mjs";

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and resolves to "C:\\C:\\..."
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "site");
const draft = process.argv.includes("--draft");
const base = process.env.SITE_BASE || "/";
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const R = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (rel, html) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const esc = T.esc;

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, "src/styles.css"), path.join(OUT, "styles.css"));

const ids = J("data/ids.json"), vocab = J("data/vocabularies.json");
const hubIndex = J("data/hub/register-index.json");
const sourcesArr = J("data/hub/sources.json").sources; const sources = Object.fromEntries(sourcesArr.map(s => [s.id, s]));
const outputs = J("data/hub/outputs.json").outputs.filter(o => o.public);
const site = { base, built: new Date().toISOString().slice(0, 10), hubExported: hubIndex.exported.slice(0, 10) };
const page = (rel, title, body, extra = {}) => write(rel, T.layout({ title, body, draft, site, path: "/" + rel.replace(/index\.html$/, ""), ...extra }));

/* ---- load modules + snapshots ---- */
const modules = fs.readdirSync(path.join(ROOT, "content/modules")).filter(f => f.endsWith(".json")).map(f => {
  const m = J(`content/modules/${f}`); m.body = fs.existsSync(path.join(ROOT, `content/modules/${m.slug}.md`)) ? md(R(`content/modules/${m.slug}.md`)) : "";
  const dir = path.join(ROOT, "data/modules", m.slug);
  m.snapshots = fs.existsSync(dir) ? fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, "data.json"))).sort().map(d => ({ dir: d, snap: JSON.parse(fs.readFileSync(path.join(dir, d, "snapshot.json"), "utf8")), data: JSON.parse(fs.readFileSync(path.join(dir, d, "data.json"), "utf8")) })) : [];
  const dated = m.snapshots.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.dir));
  m.latest = dated[dated.length - 1] || null;
  m.panels = m.snapshots.filter(x => !/^\d{4}-\d{2}-\d{2}$/.test(x.dir));
  return m;
}).sort((a, b) => a.number - b.number);
const modById = Object.fromEntries(modules.map(m => [m.roat_id, m]));

/* ---- snapshot diffs: a snapshot that declares `supersedes` is compared cell by cell with the one it replaces ---- */
const sameSet = (a, b) => { const x = [...(a || [])].sort().join(";"), y = [...(b || [])].sort().join(";"); return x === y; };
function snapshotDiff(m, s, prev) {
  const dims = (m.dimensions || []).map(d => [d.key, d.label]);
  const meta = [["rationale", "Analytical note"], ["confidence", "Confidence"], ["term", "Term"], ["framework", "Framework"], ["verification", "Verification status"], ["bridge", "Dominant legal bridge / gate"], ["caveat", "Caveat"]];
  const prevRows = Object.fromEntries((prev.data.rows || []).map(r => [r.regime_id, r]));
  const curRows = Object.fromEntries((s.data.rows || []).map(r => [r.regime_id, r]));
  const cells = [];
  for (const r of s.data.rows || []) {
    const p = prevRows[r.regime_id]; if (!p) continue;
    for (const [k, label] of [...dims, ...meta]) {
      const a = p[k] ?? "", b = r[k] ?? "";
      if (String(a) !== String(b)) cells.push({ regime_id: r.regime_id, regime_label: r.regime_label, key: k, label, before: a, after: b });
    }
    const ek = new Set([...Object.keys(p.extra || {}), ...Object.keys(r.extra || {})]);
    for (const k of ek) { const a = p.extra?.[k] ?? "", b = r.extra?.[k] ?? ""; if (String(a) !== String(b)) cells.push({ regime_id: r.regime_id, regime_label: r.regime_label, key: "extra." + k, label: k, before: a, after: b }); }
    if (!sameSet(p.records, r.records)) cells.push({ regime_id: r.regime_id, regime_label: r.regime_label, key: "records", label: "Core ROAT records", before: (p.records || []).join("; "), after: (r.records || []).join("; ") });
  }
  const rowsAdded = (s.data.rows || []).filter(r => !prevRows[r.regime_id]).map(r => r.regime_label);
  const rowsRemoved = (prev.data.rows || []).filter(r => !curRows[r.regime_id]).map(r => r.regime_label);
  return { prev, cells, rowsAdded, rowsRemoved, rowsTouched: new Set(cells.map(c => c.regime_id)).size };
}
for (const m of modules) {
  const byId = Object.fromEntries(m.snapshots.map(x => [x.snap.roat_id, x]));
  for (const s of m.snapshots) {
    const prev = s.snap.supersedes ? byId[s.snap.supersedes] : null;
    if (!prev) continue;
    s.diff = snapshotDiff(m, s, prev);
    prev.supersededBy = s;
  }
}
function diffSection(m, s) {
  const d = s.diff; if (!d) return "";
  const prevUrl = `${base}modules/${m.slug}/${d.prev.dir}/`;
  const summary = d.cells.length ? `${d.cells.length} cell${d.cells.length === 1 ? "" : "s"} in ${d.rowsTouched} row${d.rowsTouched === 1 ? "" : "s"} differ from the superseded snapshot.` : "No coded cell differs from the superseded snapshot; the change is in the snapshot record (coder, second pass, caveats).";
  const extras = [d.rowsAdded.length ? `Rows added: ${d.rowsAdded.map(esc).join(", ")}.` : "", d.rowsRemoved.length ? `Rows removed: ${d.rowsRemoved.map(esc).join(", ")}.` : ""].filter(Boolean).join(" ");
  return `<section id="changes"><div class="wrap"><p class="module">What changed</p><h2>Since snapshot <a href="${prevUrl}">${esc(d.prev.data.snapshot_date)}</a></h2>
<p class="sub">${esc(summary)} ${extras} Every difference is a deliberate recoding; the reason is recorded in the second-pass statement and the caveats below.</p>
${d.cells.length ? `<div class="tblwrap"><table class="audit diff"><thead><tr><th>Row</th><th>Dimension</th><th>Before (${esc(d.prev.data.snapshot_date)})</th><th>After (${esc(s.data.snapshot_date)})</th></tr></thead><tbody>${d.cells.map(c => `<tr><td>${esc(c.regime_label)}<br><small class="muted">${esc(c.regime_id)}</small></td><td>${esc(c.label)}</td><td class="before">${esc(c.before) || '<span class="muted">—</span>'}</td><td class="after">${esc(c.after) || '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody></table></div>` : ""}
</div></section>`;
}
const supersededBanner = (m, s) => s.supersededBy ? `<div class="wrap"><p class="superseded">This snapshot has been superseded by <a href="${base}modules/${m.slug}/${s.supersededBy.dir}/">snapshot ${esc(s.supersededBy.data.snapshot_date)}</a>${s.supersededBy.diff?.cells.length ? ` (${s.supersededBy.diff.cells.length} cells recoded)` : ""}. It stays addressable and citable as published${s.snap.doi ? `, DOI ${esc(s.snap.doi)}` : ""}.</p></div>` : "";
const jurisdictions = fs.readdirSync(path.join(ROOT, "content/jurisdictions")).filter(f => f.endsWith(".json")).map(f => { const j = J(`content/jurisdictions/${f}`); j.body = md(R(`content/jurisdictions/${j.slug}.md`)); return j; }).sort((a, b) => a.title.localeCompare(b.title));
const jurById = Object.fromEntries(jurisdictions.map(j => [j.roat_id, j]));
const baseJur = id => String(id || "").split(":")[0];
const outputById = Object.fromEntries(J("data/hub/outputs.json").outputs.map(o => [o.id, o]));

/* ---- concepts: content/concepts/*.json — a definition with its locus in the sources and the module dimensions it governs ---- */
const conceptDir = path.join(ROOT, "content/concepts");
const concepts = (fs.existsSync(conceptDir) ? fs.readdirSync(conceptDir).filter(f => f.endsWith(".json")) : []).map(f => J(`content/concepts/${f}`)).sort((a, b) => a.title.localeCompare(b.title));
const conceptById = Object.fromEntries(concepts.map(c => [c.roat_id, c]));
const conceptsOfModule = m => concepts.filter(c => (c.used_in || []).some(u => u.module === m.roat_id));
const conceptLink = c => `<a href="${base}method/concepts/${c.slug}/">${esc(c.title)}</a>`;

const snapBadge = s => s.snap.status === "published" ? "" : ` <span class="badge prospective">${esc(s.snap.status)} snapshot</span>`;
const levelNum = x => { const mm = String(x || "").match(/Level (\d)/); return mm ? Number(mm[1]) : null; };
const passesGate = id => { const r = hubIndex.records[id]; if (!r) return false; const lv = levelNum(r.evidence_level);
  return vocab.hub.publishable_stages.includes(r.stage) && (!lv || lv <= vocab.hub.evidence_level_max_for_cell); };
/** With evidence_policy "publish-evidenced-rows": a row publishes only if at least one cited record passes the
 *  gate, and sub-gate records are dropped from its sources. Everything else is listed as pending evidence. */
function splitByEvidence(m, data) {
  if (m.evidence_policy !== "publish-evidenced-rows") return { rows: data.rows, pending: [] };
  const rows = [], pending = [];
  for (const r of data.rows) {
    const keep = (r.records || []).filter(passesGate);
    const dropped = (r.records || []).filter(x => !passesGate(x));
    if ((r.records || []).length && keep.length === 0) { pending.push({ ...r, dropped }); continue; }
    rows.push({ ...r, records: keep, dropped });
  }
  return { rows, pending };
}
const recordsOf = data => [...new Set(data.rows.flatMap(r => r.records || []))].sort();

/* ---- method module renderer ---- */
function methodBody(m, s, { frozen }) {
  const d = s.data, url = `${base}modules/${m.slug}/${frozen ? s.dir + "/" : ""}`;
  const f = (label, v) => v ? `<div><dt>${esc(label)}</dt><dd>${esc(v)}</dd></div>` : "";
  return `<div class="wrap">
  <p class="crumbs"><a href="${base}modules/">Modules</a> › ${esc(m.short_title)}</p>
  <p class="eyebrow">Module ${String(m.number).padStart(2, "0")} · ${esc(m.roat_id)} · method</p>
  <h1 class="page-title">${esc(m.title)}${snapBadge(s)}</h1>
  <p class="lede" style="font-size:18px;color:var(--muted);max-width:64ch;margin:14px 0 0">${esc(m.question)}</p>
  <div class="snap"><span>Stages <b>${d.rows.length}</b></span><span>Snapshot <b>${esc(d.snapshot_date)}</b></span><span>Coder <b>${esc(s.snap.coder || "—")}</b></span><span>Hub sheet <b>${esc(d.source_sheet)}</b></span><span><a href="${url}data.csv">data.csv</a> · <a href="${url}data.json">data.json</a></span></div>
</div>
<section><div class="wrap"><div class="prose">${m.body}</div></div></section>
<section><div class="wrap"><p class="module">The framework</p><h2>Thirteen stages</h2><p class="sub">The numbering is the working order, not a ranking. Later findings may require reframing earlier stages; the process is iterative by design.</p>
<ol class="stages">${d.rows.map(r => `<li><div class="stage-head"><span class="stage-n">${r.number}</span><div><h3>${esc(r.title)}</h3><p class="q">${esc(r.question)}</p></div></div>
<dl class="stage-body">${f("ROAT operationalisation", r.operationalisation)}${f("Required output", r.output)}${f("Leenes / TechReg basis", r.basis)}${f("Automated-vehicle checks", r.checks)}${f("Existing ROAT asset", r.asset)}${f("Decision rule / caveat", r.rule)}</dl></li>`).join("")}</ol>
</div></section>
${d.verdict?.length ? `<section><div class="wrap"><p class="module">Integration verdict</p><h2>What is kept, added and held apart</h2>${T.cards(d.verdict.map(v => ({ title: v.label, lines: [v.what, { lab: "Why", text: v.why }, { lab: "How it is used", text: v.how }].filter(x => x && (x.text || typeof x === "string")) })))}</div></section>` : ""}
<section><div class="wrap"><p class="module">Snapshot record</p><h2>Provenance</h2><dl class="kv" style="max-width:70ch">
<dt>Snapshot</dt><dd><code>${esc(s.snap.roat_id)}</code> · ${esc(d.snapshot_date)} · exported from Hub ${esc(d.exported_from_hub.slice(0, 10))}</dd>
<dt>Nature of this page</dt><dd>A methods statement. It carries no jurisdiction claims, so it has no per-row evidence; the sources below support the framework as a whole.</dd>
${s.snap.caveats?.length ? `<dt>Caveats</dt><dd><ul>${s.snap.caveats.map(c => `<li>${esc(c)}</li>`).join("")}</ul></dd>` : ""}
<dt>Applied in</dt><dd>${(m.relationships.related_module || []).map(o => modById[o] ? `<a href="${base}modules/${modById[o].slug}/">${esc(modById[o].title)}</a>` : esc(o)).join("; ")}</dd>
</dl>
<p class="module" style="margin-top:22px">Sources</p>
${(m.sources || []).map(id => `<div class="srcrow">${T.chips([id], site, sources)}<div>${sources[id] ? esc(sources[id].title) : `<span class="muted">${esc(hubIndex.records[id]?.record_type || "record")} · ${esc(hubIndex.records[id]?.stage || "?")} — not yet in the public Source Library</span>`}</div></div>`).join("")}
${T.citeBlock({ module: m, snap: s.snap, site, url })}
</div></section>`;
}

/* ---- module page renderer (latest or dated) ---- */
function moduleBody(m, s0, { frozen }) {
  const s = s0; const split = splitByEvidence(m, s0.data);
  const d = { ...s0.data, rows: split.rows }; const pending = split.pending; const url = `${base}modules/${m.slug}/${frozen ? s.dir + "/" : ""}`;
  const findings = d.findings || {};
  const others = m.snapshots.filter(x => x !== s);
  return `<div class="wrap">
  <p class="crumbs"><a href="${base}modules/">Modules</a> › ${esc(m.short_title)}${frozen ? ` › ${esc(s.dir)}` : ""}</p>
  <p class="eyebrow">Module ${String(m.number).padStart(2, "0")} · ${esc(m.roat_id)}</p>
  <h1 class="page-title">${esc(m.title)}${snapBadge(s)}</h1>
  <p class="lede" style="font-size:18px;color:var(--muted);max-width:64ch;margin:14px 0 0">${esc(m.question)}</p>
  <div class="snap"><span>Snapshot <b>${esc(d.snapshot_date)}</b>${frozen ? " (frozen)" : " (latest)"}</span><span>Rows <b>${d.rows.length}</b></span><span>Coder <b>${esc(s.snap.coder || "—")}</b></span><span>DOI <b>${esc(s.snap.doi || "not yet minted")}</b></span><span>Hub sheet <b>${esc(d.source_sheet)}</b></span><span><a href="${url}data.csv">data.csv</a> · <a href="${url}data.json">data.json</a></span>${s.diff ? `<span><a href="#changes">Changes since ${esc(s.diff.prev.data.snapshot_date)} <b>${s.diff.cells.length}</b></a></span>` : ""}</div>
</div>
${supersededBanner(m, s)}
<section><div class="wrap"><div class="prose">${m.body}<p class="muted" style="font-size:14px">${esc(m.method_summary)}</p></div></div></section>
<section><div class="wrap"><p class="module">The table</p><h2>Coded rows</h2><p class="sub">Select a row for every coded dimension, the rationale and the ROAT records behind it.</p>
${T.moduleTable(m, d, { site, sources, vocab, idPrefix: m.slug, defaultOpen: "ROAT-JUR-SK" })}
${pending.length ? `<p class="hint">${pending.length} of ${s.data.rows.length} coded rows are not published: their evidence is entirely below the evidence gate. They are listed under Pending evidence below.</p>` : ""}
${m.dimensions.some(x => x.scale === "n-scale") ? `<p class="hint">Scores measure legal embedding, not regulatory intensity. Draft law is excluded from current-law scores and shown separately (dashed cells).</p>` : ""}
</div></section>
${d.pathways?.length ? `<section><div class="wrap"><p class="module">Pathway families</p><h2>Recurring configurations</h2>${T.cards(d.pathways.map(p => ({ title: p.pathway, lines: [p.pattern, { lab: "2026 case", text: p.case, cls: "case" }, { lab: "Analytical value", text: p.value }] })))}${findings["Cross-sectional finding"] ? `<blockquote class="find"><p>${esc(findings["Cross-sectional finding"])}</p></blockquote>` : ""}${findings["Novelty implication"] ? `<p class="note" style="margin-top:14px">${esc(findings["Novelty implication"])}</p>` : ""}</div></section>` : ""}
${d.audit?.length ? `<section><div class="wrap"><p class="module">Robustness</p><h2>Second-pass recoding audit</h2><p class="sub">${esc(s.snap.second_pass || "Rule-based recoding by the same coder — a sensitivity check, not inter-coder reliability.")}</p><div class="tblwrap"><table class="audit"><thead><tr><th>Cell audited</th><th>First pass</th><th>Strict decision rule</th><th>Second pass</th><th>Change</th><th>Effect on pathway</th></tr></thead><tbody>${d.audit.map(a => `<tr><td>${esc(a.cell)}</td><td>${esc(a.first)}</td><td>${esc(a.rule)}</td><td>${esc(a.second)}</td><td>${esc(a.change)}</td><td>${esc(a.effect)}</td></tr>`).join("")}</tbody></table></div><p class="hint">${esc((d.audit_result || []).join(" "))}</p></div></section>` : ""}
${diffSection(m, s)}
${pending.length ? `<section><div class="wrap"><p class="module">Pending evidence</p><h2>Coded but not published</h2><p class="sub">These rows exist in the Hub sheet and are coded, but every record behind them is below the evidence gate — Research Stage below Verified, or Evidence Level 5 to 6. They are published once the primary source named here is captured and verified.</p><div class="tblwrap"><table class="audit"><thead><tr><th>Row</th><th>Framework</th><th>Primary source it needs</th><th>Records held today</th></tr></thead><tbody>${pending.map(r => `<tr><td>${esc(r.regime_label)}${r.regime_id ? `<br><small class="muted">${esc(r.regime_id)}</small>` : ""}</td><td>${esc(r.framework || "")}</td><td>${esc((r.extra && (r.extra["Primary legal / technical source"] || r.extra["Primary source URL"])) || "—")}</td><td>${(r.dropped || []).map(x => `<span class="chip">${esc(x)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div></div></section>` : ""}
<section><div class="wrap"><p class="module">Snapshot record</p><h2>Provenance</h2><dl class="kv" style="max-width:70ch">
<dt>Snapshot</dt><dd><code>${esc(s.snap.roat_id)}</code> · legal snapshot date ${esc(d.snapshot_date)} · exported from Hub ${esc(d.exported_from_hub.slice(0, 10))}</dd>
<dt>Coder · second pass</dt><dd>${esc(s.snap.coder || "—")} · ${esc(s.snap.second_pass || "—")}</dd>
${s.snap.caveats?.length ? `<dt>Caveats</dt><dd><ul>${s.snap.caveats.map(c => `<li>${esc(c)}</li>`).join("")}</ul></dd>` : ""}
<dt>Companion research</dt><dd>${(m.relationships.companion_of || []).map(o => outputById[o] ? `<a href="${base}research/#${o.toLowerCase()}">${esc(outputById[o].title)}</a> (${esc(o)})` : `<span class="muted">${esc(o)} — pending OUT id</span>`).join("; ") || "—"}</dd>
<dt>Related modules</dt><dd>${(m.relationships.related_module || []).map(o => modById[o] ? `<a href="${base}modules/${modById[o].slug}/">${esc(modById[o].title)}</a>` : esc(o)).join("; ") || "—"}</dd>
${conceptsOfModule(m).length ? `<dt>Concepts</dt><dd>${conceptsOfModule(m).map(c => `${conceptLink(c)} <span class="muted">(${(c.used_in || []).filter(u => u.module === m.roat_id).map(u => esc((m.dimensions.find(d => d.key === u.dimension) || {}).label || u.dimension)).join(", ")})</span>`).join("; ")}</dd>` : ""}
<dt>All snapshots</dt><dd>${m.snapshots.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.dir)).map(x => (x === s ? `<b>${esc(x.dir)}</b>` : `<a href="${base}modules/${m.slug}/${x.dir}/">${esc(x.dir)}</a>`) + (x.supersededBy ? ` <span class="muted">(superseded)</span>` : "")).join(" · ")}</dd>
${s.snap.supersedes ? `<dt>Supersedes</dt><dd><code>${esc(s.snap.supersedes)}</code>${s.diff ? ` · <a href="#changes">${s.diff.cells.length} cells recoded</a>` : ""}</dd>` : ""}
${m.panels.length ? `<dt>Additional panels</dt><dd>${m.panels.map(x => x === s ? `<b>${esc(x.snap.label || x.dir)}</b>` : `<a href="${base}modules/${m.slug}/${x.dir}/">${esc(x.snap.label || x.dir)}</a>${snapBadge(x)}`).join("<br>")}</dd>` : ""}
</dl>
${d.findings_table?.length ? `<p class="module" style="margin-top:22px">Findings recorded with this panel</p><div class="tblwrap"><table class="audit"><thead><tr>${Object.keys(d.findings_table[0]).map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${d.findings_table.map(r => `<tr>${Object.values(r).map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
<p class="module" style="margin-top:22px">Sources cited in this snapshot</p>
${recordsOf(d).filter(passesGate).map(id => `<div class="srcrow">${T.chips([id], site, sources)}<div>${sources[id] ? esc(sources[id].title) : `<span class="muted">${esc(hubIndex.records[id]?.record_type || "record")} · ${esc(hubIndex.records[id]?.stage || "?")} · ${esc(hubIndex.records[id]?.evidence_level || "")} — not yet in the public Source Library</span>`}</div></div>`).join("")}
${T.citeBlock({ module: m, snap: s.snap, site, url })}
</div></section>`;
}

/* ---- pages ---- */
// modules
for (const m of modules) {
  if (!m.latest) { page(`modules/${m.slug}/index.html`, m.title, `<div class="wrap"><h1 class="page-title">${esc(m.title)}</h1><p class="note">No snapshot yet.</p></div>`); continue; }
  const render = m.kind === "method" ? methodBody : moduleBody;
  page(`modules/${m.slug}/index.html`, m.title, render(m, m.latest, { frozen: false }), { description: m.question });
  for (const s of m.snapshots) {
    page(`modules/${m.slug}/${s.dir}/index.html`, `${m.title} — ${s.dir}`, render(m, s, { frozen: true }), { description: m.question });
    for (const f of ["data.csv", "data.json", "snapshot.json"]) fs.copyFileSync(path.join(ROOT, "data/modules", m.slug, s.dir, f), path.join(OUT, "modules", m.slug, s.dir, f));
  }
  for (const f of ["data.csv", "data.json"]) fs.copyFileSync(path.join(ROOT, "data/modules", m.slug, m.latest.dir, f), path.join(OUT, "modules", m.slug, f));
}
page("modules/index.html", "Modules", `<div class="wrap"><h1 class="page-title">Modules</h1><p class="sub" style="margin-top:10px">Each module is one comparative model with dated, frozen snapshots of its coded data.</p>
${T.cards(modules.map(m => ({ lab: `Module ${String(m.number).padStart(2, "0")} · ${m.roat_id}`, title: m.title, href: `${base}modules/${m.slug}/`, lines: [m.question, { lab: "Latest snapshot", text: m.latest ? `${m.latest.data.snapshot_date} · ${m.latest.data.rows.length} ${m.kind === "method" ? "stages" : "rows"} · ${m.latest.snap.status}` : "none" }] })))}</div>`);

// home = Module 01 table + Module 02 summary
const m1 = modById["ROAT-MOD-LAYERS"], m2 = modById["ROAT-MOD-SECOND-GATE"];
page("index.html", "ROAT Observatory", `<header class="mast"><div class="wrap">
  <p class="eyebrow">ROAT Observatory</p>
  <h1>How law lets automated vehicles onto the road</h1>
  <p class="lede">Comparative deployment governance for automated vehicles: how far each regulatory function has normalised, which legal bridge or gate carries the mismatch, and what happens after type approval.</p>
  <div class="snap"><span>Layer matrix snapshot <b>${esc(m1?.latest?.data.snapshot_date || "—")}</b></span><span>Second Gate snapshot <b>${esc(m2?.latest?.data.snapshot_date || "—")}</b></span><span>Modules <b>${modules.length}</b></span><span>Jurisdiction profiles <b>${jurisdictions.length}</b></span></div>
</div></header>
${m1?.latest ? `<section id="matrix"><div class="wrap"><p class="module">Module 01 · Layered normalisation</p><h2>${esc(m1.title)}, ${esc(m1.latest.data.snapshot_date.slice(0, 4))}</h2><p class="sub">${esc(m1.question)} <a href="${base}modules/${m1.slug}/">Full module →</a></p>${T.moduleTable(m1, m1.latest.data, { site, sources, vocab, idPrefix: "home-m1", defaultOpen: "ROAT-JUR-SK" })}</div></section>` : ""}
${m1?.latest?.data.pathways?.length ? `<section><div class="wrap"><p class="module">Module 01 · Pathway families</p><h2>Four ways a regime gets there</h2>${T.cards(m1.latest.data.pathways.map(p => ({ title: p.pathway, lines: [p.pattern, { lab: "2026 case", text: p.case, cls: "case" }] })))}</div></section>` : ""}
${m2?.latest ? `<section id="gate"><div class="wrap"><p class="module">Module 02 · Second Gate</p><h2>What stands between type approval and lawful driverless operation</h2><p class="sub">${esc(m2.question)} <a href="${base}modules/${m2.slug}/">Full module →</a></p>${T.moduleTable(m2, m2.latest.data, { site, sources, vocab, idPrefix: "home-m2", defaultOpen: "ROAT-JUR-SK" })}</div></section>` : ""}
<section><div class="wrap"><p class="module">Method</p><h2>The N0–N4 scale</h2><div class="defs">${vocab.n_scale.map(n => `<div class="def" style="border-color:var(--n${n.value})"><b>N${n.value}</b>${esc(n.label)}<br><small>${esc(n.definition)}</small></div>`).join("")}</div><p class="note" style="margin-top:16px">Ordinal, never aggregated into a maturity index; reversible. <a href="${base}method/n-scale/">Method →</a></p></div></section>`, { description: "Comparative models of automated-vehicle deployment governance, published from the ROAT Intelligence Hub at dated snapshots." });

// jurisdictions
for (const j of jurisdictions) {
  const rowsIn = modules.filter(m => m.kind !== "method").map(m => ({ m, rows: (m.latest?.data.rows || []).filter(r => baseJur(r.regime_id) === j.roat_id) })).filter(x => x.rows.length);
  const srcs = Object.values(sources).filter(s => (s.jurisdiction || "").toLowerCase().includes(j.title.toLowerCase().split(" ")[0]));
  page(`jurisdictions/${j.slug}/index.html`, j.title, `<div class="wrap"><p class="crumbs"><a href="${base}jurisdictions/">Jurisdictions</a> › ${esc(j.title)}</p><p class="eyebrow">${esc(j.roat_id)}</p><h1 class="page-title">${esc(j.title)}</h1>
<div class="snap"><span>Last verified <b>${esc(j.last_verified)}</b> (${esc(j.verified_by)})</span><span>Authorities <b>${esc((j.authorities || []).join(" · "))}</b></span></div>
<div class="prose" style="margin-top:18px">${j.body}<p class="muted" style="font-size:14px">${esc(j.legal_snapshot_note || "")}</p></div></div>
${rowsIn.map(({ m, rows }) => `<section><div class="wrap"><p class="module">In Module ${String(m.number).padStart(2, "0")} · snapshot ${esc(m.latest.data.snapshot_date)}${snapBadge(m.latest)}</p><h2><a href="${base}modules/${m.slug}/" style="border:0;color:inherit">${esc(m.title)}</a></h2>${T.moduleTable(m, { ...m.latest.data, rows }, { site, sources, vocab, idPrefix: `${j.slug}-${m.slug}`, defaultOpen: rows[0].regime_id })}</div></section>`).join("")}
${rowsIn.length ? "" : `<section><div class="wrap"><p class="note">Not yet coded in any module.</p></div></section>`}
<section><div class="wrap"><p class="module">Sources</p><h2>Public Library records for ${esc(j.title)}</h2>${srcs.length ? srcs.map(s => `<div class="srcrow">${T.chips([s.id], site, sources)}<div>${esc(s.title)}</div></div>`).join("") : `<p class="note muted">The public Source Library is in editorial review; records will appear here once published in the Hub.</p>`}</div></section>`);
}
page("jurisdictions/index.html", "Jurisdictions", `<div class="wrap"><h1 class="page-title">Jurisdictions</h1><p class="sub" style="margin-top:10px">A profile is a view across modules — every row a module has coded for the jurisdiction — plus a short verified overview.</p>
${T.cards(jurisdictions.map(j => ({ lab: j.roat_id, title: j.title, href: `${base}jurisdictions/${j.slug}/`, lines: [{ lab: "Coded in", text: modules.filter(m => m.kind !== "method" && (m.latest?.data.rows || []).some(r => baseJur(r.regime_id) === j.roat_id)).map(m => m.short_title).join(" · ") || "—" }, { lab: "Last verified", text: `${j.last_verified} (${j.verified_by})` }] })))}</div>`);

// sources
page("sources/index.html", "Sources", `<div class="wrap"><h1 class="page-title">Source Library</h1><p class="sub" style="margin-top:10px">Curated public catalogue of ROAT Intelligence Hub records with Public Status = Published. Every module cell cites records from this library.</p>
${sourcesArr.length ? sourcesArr.map(s => `<div class="srcrow">${T.chips([s.id], site, sources)}<div><b>${esc(s.title)}</b><br><span class="muted">${esc([s.record_type, s.jurisdiction, s.legal_status, s.publication_date].filter(Boolean).join(" · "))}</span></div></div>`).join("") : `<p class="note">No records have Public Status = Published yet. ${Object.keys(hubIndex.records).length} records exist in the Hub; ${Object.values(hubIndex.records).filter(r => r.public_status === "Review").length} are in editorial review. Records cited by module snapshots: ${[...new Set(modules.flatMap(m => m.latest ? recordsOf(m.latest.data) : []))].length}.</p>`}</div>`);
for (const s of sourcesArr) {
  const citing = modules.flatMap(m => (m.latest?.data.rows || []).filter(r => (r.records || []).includes(s.id)).map(r => ({ m, r })));
  page(`sources/${s.id.toLowerCase()}/index.html`, s.title, `<div class="wrap"><p class="crumbs"><a href="${base}sources/">Sources</a> › ${esc(s.id)}</p><p class="eyebrow">${esc(s.id)} · ${esc(s.record_type)}</p><h1 class="page-title">${esc(s.title)}</h1>
<dl class="kv" style="max-width:70ch;margin-top:16px">${[["Organisation", s.org], ["Jurisdiction", s.jurisdiction], ["Publication date", s.publication_date], ["Legal status", s.legal_status], ["Effective from", s.effective_from], ["Summary", s.summary], ["Why it matters", s.why_it_matters], ["Citation", s.citation], ["Last verified", s.last_verified]].filter(x => x[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}${s.official_source ? `<dt>Official source</dt><dd><a href="${esc(s.official_source)}">${esc(s.official_source)}</a></dd>` : ""}</dl>
<p class="module" style="margin-top:22px">Cited by</p>${citing.length ? `<ul>${citing.map(({ m, r }) => `<li><a href="${base}modules/${m.slug}/">${esc(m.short_title)}</a> — ${esc(r.regime_label)}</li>`).join("")}</ul>` : `<p class="muted">No module cell cites this record.</p>`}</div>`);
}

// research
page("research/index.html", "Research", `<div class="wrap"><h1 class="page-title">Research</h1><p class="sub" style="margin-top:10px">ROAT outputs that the modules belong to. Each is catalogued in the Hub Outputs sheet.</p>
${outputs.map(o => `<div class="srcrow" id="${o.id.toLowerCase()}"><span class="chip">${esc(o.id)}</span><div><b>${esc(o.title)}</b><br><span class="muted">${esc([o.type, o.status, o.project].filter(Boolean).join(" · "))}</span>${modules.filter(m => (m.relationships.companion_of || []).includes(o.id)).map(m => `<br>Companion module: <a href="${base}modules/${m.slug}/">${esc(m.title)}</a>`).join("")}</div></div>`).join("")}</div>`);

// method pages
const methodFiles = fs.readdirSync(path.join(ROOT, "content/method")).filter(f => f.endsWith(".md")).sort();
const methodMeta = methodFiles.map(f => { const { meta, body } = splitFront(R(`content/method/${f}`)); return { slug: f.replace(/\.md$/, ""), title: meta.title || f, order: meta.order ?? 99, body: md(body) }; }).sort((a, b) => a.order - b.order);
for (const p of methodMeta) page(`method/${p.slug}/index.html`, p.title, `<div class="wrap"><p class="crumbs"><a href="${base}method/">Method</a> › ${esc(p.title)}</p><h1 class="page-title">${esc(p.title)}</h1><div class="prose" style="margin-top:18px">${p.body}</div>${p.slug === "n-scale" ? `<div class="defs" style="margin-top:20px">${vocab.n_scale.map(n => `<div class="def" style="border-color:var(--n${n.value})"><b>N${n.value}</b>${esc(n.label)}<br><small>${esc(n.definition)}</small></div>`).join("")}</div>` : ""}</div>`);
page("method/index.html", "Method", `<div class="wrap"><h1 class="page-title">Method</h1><p class="sub" style="margin-top:10px">How the Observatory codes, verifies and publishes — and the analytical framework the modules apply.</p>
${T.cards(modules.filter(m => m.kind === "method").map(m => ({ lab: `Module ${String(m.number).padStart(2, "0")}`, title: m.title, href: `${base}modules/${m.slug}/`, lines: [m.question] })))}
<ul class="plain" style="margin-top:20px">${methodMeta.map(p => `<li><a href="${base}method/${p.slug}/">${esc(p.title)}</a></li>`).join("")}${concepts.length ? `<li><a href="${base}method/concepts/">Concepts</a> — ${concepts.length} defined terms with their locus in the sources</li>` : ""}<li><a href="${base}about/changelog/">Changelog</a></li></ul></div>`);

// concept pages: definition, locus, where the Observatory uses the concept (the module column, row by row)
const conceptBadge = c => c.definition_status === "approved" ? "" : ` <span class="badge prospective" title="${esc(c.drafted || "")}">draft definition</span>`;
for (const c of concepts) {
  const uses = (c.used_in || []).map(u => { const m = modById[u.module]; const d = m?.dimensions.find(x => x.key === u.dimension); return m && m.latest ? { m, d } : null; }).filter(Boolean);
  const useBlocks = uses.map(({ m, d }) => {
    const rows = splitByEvidence(m, m.latest.data).rows; // published rows only; prospective rows are shown with a badge
    const isRole = d.scale === "role-value";
    return `<section><div class="wrap"><p class="module">In Module ${String(m.number).padStart(2, "0")} · column “${esc(d.label)}” · snapshot ${esc(m.latest.data.snapshot_date)}${snapBadge(m.latest)}</p><h2><a href="${base}modules/${m.slug}/" style="border:0;color:inherit">${esc(m.title)}</a></h2>
<div class="tblwrap"><table class="audit"><thead><tr><th>${isRole ? "Role" : "Regime"}</th><th>${esc(d.label)}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.regime_label)}${r.framework ? `<br><small class="muted">${esc(r.framework)}</small>` : ""}${(r.panel || "current") === "prospective" ? ' <span class="badge prospective">prospective</span>' : ""}</td>${isRole ? T.roleCell(r[d.key]) : `<td>${esc(r[d.key] || "—")}</td>`}</tr>`).join("")}</tbody></table></div>${isRole ? T.legendRoles() : ""}</div></section>`;
  });
  page(`method/concepts/${c.slug}/index.html`, c.title, `<div class="wrap"><p class="crumbs"><a href="${base}method/">Method</a> › <a href="${base}method/concepts/">Concepts</a> › ${esc(c.title)}</p><p class="eyebrow">${esc(c.roat_id)} · concept</p><h1 class="page-title">${esc(c.title)}${conceptBadge(c)}</h1>
${c.aliases?.length ? `<p class="muted" style="margin-top:8px">Also: ${c.aliases.map(esc).join(" · ")}</p>` : ""}
<div class="prose" style="margin-top:18px"><p>${esc(c.definition)}</p></div>
${c.definition_status !== "approved" ? `<p class="hint">${esc(c.drafted || "Definition drafted; author review pending.")}</p>` : ""}
<p class="module" style="margin-top:22px">Locus in the sources</p>
${(c.locus || []).map(l => `<div class="srcrow">${T.chips([l.record], site, sources)}<div><b>${esc(sources[l.record]?.title || hubIndex.records[l.record]?.record_type || l.record)}</b> — ${esc(l.pinpoint)}${l.note ? `<br><span class="muted">${esc(l.note)}</span>` : ""}</div></div>`).join("")}
${c.related?.length ? `<p class="module" style="margin-top:22px">Related concepts</p><p>${c.related.map(r => conceptById[r] ? conceptLink(conceptById[r]) : esc(r)).join(" · ")}</p>` : ""}
</div>
${useBlocks.join("")}
<section><div class="wrap"><div class="note" style="border-top:1px solid var(--rule);padding-top:14px"><p class="module">Cite this concept</p><p>ROAT Observatory, concept <em>${esc(c.title)}</em> [<code>${esc(c.roat_id)}</code>], ${esc(c.definition_status)} definition, ${esc(site.built)}. Faculty of Law, Comenius University Bratislava. ${esc(base)}method/concepts/${esc(c.slug)}/</p></div></div></section>`, { description: c.definition.slice(0, 160) });
}
if (concepts.length) page("method/concepts/index.html", "Concepts", `<div class="wrap"><p class="crumbs"><a href="${base}method/">Method</a> › Concepts</p><h1 class="page-title">Concepts</h1><p class="sub" style="margin-top:10px">The terms the modules code against, each with its definition, its locus in the primary sources and the module columns it governs. A draft badge means the definition has been drafted from the sources and awaits the author's review.</p>
${T.cards(concepts.map(c => ({ lab: c.roat_id, title: c.title + (c.definition_status === "approved" ? "" : " (draft)"), href: `${base}method/concepts/${c.slug}/`, lines: [c.definition.split(". ")[0] + ".", { lab: "Used in", text: (c.used_in || []).map(u => modById[u.module]?.short_title).filter(Boolean).join(" · ") || "—" }] })))}</div>`);

// changelog: repository history plus every snapshot the site holds
const snapRows = modules.flatMap(m => m.snapshots.map(x => ({ m, x }))).sort((a, b) => String(b.x.data.snapshot_date).localeCompare(String(a.x.data.snapshot_date)));
page("about/changelog/index.html", "Changelog", `<div class="wrap"><h1 class="page-title">Changelog</h1>
<p class="sub" style="margin-top:10px">Every snapshot the Observatory holds, and what changed in the repository that builds them.</p>
<p class="module" style="margin-top:26px">Snapshots</p><div class="tblwrap"><table class="audit"><thead><tr><th>Snapshot date</th><th>Module</th><th>Snapshot</th><th>Rows</th><th>Status</th><th>Supersedes</th><th>DOI</th></tr></thead><tbody>
${snapRows.map(({ m, x }) => `<tr><td><a href="${base}modules/${m.slug}/${x.dir}/">${esc(x.data.snapshot_date)}</a>${/^\d{4}-/.test(x.dir) ? "" : ` <span class="muted">(${esc(x.dir)})</span>`}</td><td><a href="${base}modules/${m.slug}/">${esc(m.short_title)}</a></td><td><code>${esc(x.snap.roat_id)}</code></td><td>${x.data.rows.length}</td><td>${esc(x.snap.status)}${x.supersededBy ? ' <span class="muted">· superseded</span>' : ""}</td><td>${x.snap.supersedes ? `<a href="${base}modules/${m.slug}/${x.diff ? x.diff.prev.dir : ""}/">${esc(x.diff ? x.diff.prev.data.snapshot_date : x.snap.supersedes)}</a>${x.diff ? ` <span class="muted">(${x.diff.cells.length} cells)</span>` : ""}` : '<span class="muted">—</span>'}</td><td>${x.snap.doi ? esc(x.snap.doi) : '<span class="muted">not minted</span>'}</td></tr>`).join("")}
</tbody></table></div>
<p class="module" style="margin-top:30px">Repository</p><div class="prose">${md(R("CHANGELOG.md").replace(/^# Changelog\s*/, ""))}</div>
<p class="note muted" style="margin-top:22px">A published snapshot is immutable. Corrections produce a new dated snapshot that supersedes the old one; both stay addressable.</p></div>`);

// id resolver
const resolve = {};
for (const m of modules) { resolve[m.roat_id] = `modules/${m.slug}/`; for (const s of m.snapshots) resolve[s.snap.roat_id] = `modules/${m.slug}/${s.dir}/`; }
for (const j of jurisdictions) resolve[j.roat_id] = `jurisdictions/${j.slug}/`;
for (const s of sourcesArr) resolve[s.id] = `sources/${s.id.toLowerCase()}/`;
for (const c of concepts) resolve[c.roat_id] = `method/concepts/${c.slug}/`;
for (const [id, target] of Object.entries(resolve)) write(`id/${id}/index.html`, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${base}${target}"><title>${esc(id)}</title><a href="${base}${target}">${esc(id)}</a>`);
write("id/index.json", JSON.stringify(resolve, null, 1));

console.log(`[build] ${draft ? "DRAFT " : ""}site written to site/ — ${modules.length} modules, ${jurisdictions.length} jurisdictions, ${sourcesArr.length} sources, ${Object.keys(resolve).length} resolvable IDs`);
