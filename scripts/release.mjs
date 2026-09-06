#!/usr/bin/env node
// Release helper for the Observatory. Three modes, all of them refusing to guess:
//
//   node scripts/release.mjs --check
//       Preflight only. Reports whether the repository is in a releasable state and which
//       snapshots the embargo (Architecture §9.3) would let out. Changes nothing.
//
//   node scripts/release.mjs --prepare --version 0.3.0 --title "Second Gate published"
//       Bumps package.json and CITATION.cff, turns the CHANGELOG's "Unreleased" section into a
//       dated heading, and flips the snapshots the embargo releases from review to published.
//       Refuses to run if --check would fail. Add --force only with a written reason.
//
//   node scripts/release.mjs --doi 10.5281/zenodo.NNNNNNNN
//       Writes a minted version DOI into every snapshot that is part of the published record and
//       still carries "doi": null. A snapshot that already has a DOI keeps it: the DOI records the
//       release in which the snapshot first became citable, and rewriting it would break citations.
//
// The Hub is never touched. Output status comes from data/hub/outputs.json, which hub-sync writes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const R = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const W = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

// Accept both `--version=0.3.0` and `--version 0.3.0`: on release day the difference between the two
// should not be the thing that goes wrong.
const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--([^=]+)(?:=([\s\S]*))?$/);
    if (!m) { args[argv[i]] = true; continue; }
    if (m[2] !== undefined) { args[m[1]] = m[2]; continue; }
    const next = argv[i + 1];
    if (next !== undefined && !/^--/.test(next)) { args[m[1]] = next; i++; }
    else args[m[1]] = true;
  }
}

const ok = [], bad = [], note = [];
const pass = m => ok.push(m);
const fail = m => bad.push(m);

/* ---------- what the repository holds ---------- */

const pkg = J("package.json");
const cff = R("CITATION.cff");
const cffVersion = (cff.match(/^version:\s*(.+)$/m) || [])[1]?.trim();
const outputs = Object.fromEntries((J("data/hub/outputs.json").outputs || []).map(o => [o.id, o]));

const modules = fs.readdirSync(path.join(ROOT, "content/modules")).filter(f => f.endsWith(".json")).map(f => J(`content/modules/${f}`));
const snapshots = [];
for (const m of modules) {
  const dir = path.join(ROOT, "data/modules", m.slug);
  if (!fs.existsSync(dir)) continue;
  for (const d of fs.readdirSync(dir)) {
    const p = `data/modules/${m.slug}/${d}/snapshot.json`;
    if (!fs.existsSync(path.join(ROOT, p))) continue;
    snapshots.push({ module: m, dir: d, file: p, snap: J(p), dated: /^\d{4}-\d{2}-\d{2}$/.test(d) });
  }
}

// A manuscript counts as submitted once the Hub says so, and only for a value on this closed list.
// Prefix matching is not safe here: "Submission preparation" must not pass, and neither must a status
// someone invents. An unknown value fails closed and is printed so the author can fix the Hub or this list.
const SUBMITTED = new Set([
  "submitted", "under review", "in review", "revise and resubmit", "revision requested",
  "under revision", "accepted", "in press", "published"
]);
const isSubmitted = s => SUBMITTED.has(String(s || "").trim().toLowerCase());
const companionSubmitted = m => {
  const ids = m.relationships?.companion_of || [];
  if (!ids.length) return { released: true, why: "no companion manuscript, so no embargo" };
  const states = ids.map(id => ({ id, status: outputs[id]?.status || "unknown to the Hub" }));
  const blocking = states.filter(s => !isSubmitted(s.status));
  return blocking.length
    ? { released: false, why: blocking.map(s => `${s.id} is "${s.status}"`).join(", ") }
    : { released: true, why: states.map(s => `${s.id} is "${s.status}"`).join(", ") };
};

// Snapshots the embargo would let out: review snapshots of a module whose companion is submitted.
const releasable = snapshots.filter(s => s.snap.status === "review" && companionSubmitted(s.module).released);
const blocked = snapshots.filter(s => s.snap.status === "review" && !companionSubmitted(s.module).released);

/* ---------- preflight ---------- */

function preflight() {
  // 1. validation
  try {
    execSync("node scripts/validate.mjs", { cwd: ROOT, stdio: "pipe" });
    pass("validation passes with 0 errors");
  } catch (e) {
    fail("validation fails — run `npm run validate` and fix it before releasing");
  }

  // 2. working tree
  try {
    const st = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
    const leaks = st.split("\n").filter(l => /hub-export|site\/|Claude outputs/.test(l));
    if (leaks.length) fail(`git status shows ignored material: ${leaks.join(" ")}`);
    else pass("no hub-export/, site/ or Claude outputs/ in git status");
    const dirty = st.split("\n").filter(l => l.trim() && !/^\?\?/.test(l));
    if (dirty.length) note.push(`${dirty.length} file(s) modified but not committed — commit them before tagging`);
    else pass("working tree is clean");
  } catch { note.push("git not available; skipped the working-tree check"); }

  // 3. version consistency
  if (cffVersion === pkg.version) pass(`version ${pkg.version} matches in package.json and CITATION.cff`);
  else fail(`version mismatch: package.json ${pkg.version}, CITATION.cff ${cffVersion}`);

  // 4. placeholder companion ids. The registry key is external_outputs_pending; a module whose
  // companion_of points at one of those is citing a manuscript that has no Hub identifier yet.
  const ids = J("data/ids.json");
  const pending = Object.keys(ids.external_outputs_pending || {});
  const citing = modules.filter(m => (m.relationships?.companion_of || []).some(t => pending.includes(t)));
  if (citing.length) fail(`placeholder companion output still cited by ${citing.map(m => m.slug).join(", ")}: ${pending.join(", ")}`);
  else if (pending.length) note.push(`registered but uncited placeholders: ${pending.join(", ")}`);
  else pass("no placeholder companion outputs");

  // 5. published snapshots must carry a DOI
  const undoi = snapshots.filter(s => s.snap.status === "published" && !s.snap.doi);
  if (undoi.length) fail(`published snapshot without a DOI: ${undoi.map(s => s.file).join(", ")}`);
  else pass("every published snapshot carries a version DOI");

  // 6. something to release
  const cl = R("CHANGELOG.md");
  const unreleased = cl.match(/## Unreleased\n([\s\S]*?)(?=\n## |\n*$)/);
  const bullets = unreleased ? unreleased[1].split("\n").filter(l => l.trim().startsWith("- ")).length : 0;
  if (bullets) pass(`CHANGELOG Unreleased section has ${bullets} entr${bullets === 1 ? "y" : "ies"}`);
  else fail("CHANGELOG has no Unreleased section with entries — nothing to describe in a release");

  // 7. embargo
  console.log("\n## Embargo (Architecture §9.3)\n");
  for (const m of modules) {
    const c = companionSubmitted(m);
    const mine = snapshots.filter(s => s.module.slug === m.slug);
    const states = mine.map(s => `${s.dir} ${s.snap.status}`).join(", ") || "no snapshots";
    console.log(`- ${m.slug}: ${c.released ? "released" : "EMBARGOED"} — ${c.why}\n  snapshots: ${states}`);
  }

  console.log("\n## Preflight\n");
  for (const m of ok) console.log(`- ok       ${m}`);
  for (const m of note) console.log(`- note     ${m}`);
  for (const m of bad) console.log(`- BLOCKED  ${m}`);

  console.log("\n## What --prepare would change\n");
  if (releasable.length) for (const s of releasable) console.log(`- ${s.file}: status review → published`);
  else console.log("- no snapshot changes status: no embargoed module has a submitted companion");
  if (blocked.length) console.log(`- still embargoed: ${blocked.map(s => s.module.slug + "/" + s.dir).join(", ")}`);

  return bad.length === 0;
}

/* ---------- prepare ---------- */

function prepare() {
  // A flag given without a value arrives as boolean true; accepting it would stamp "true" into
  // CITATION.cff or the CHANGELOG heading, so every string flag is type-checked before anything is read.
  const version = args.version;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) { console.error("--prepare needs --version X.Y.Z (with a value)"); process.exit(1); }
  if (args.title !== undefined && typeof args.title !== "string") { console.error('--title needs a value, e.g. --title "Second Gate published"'); process.exit(1); }
  const title = String(args.title || "").trim();
  if (!title) { console.error('--prepare needs --title "short description of the release"'); process.exit(1); }
  if (args.date !== undefined && (typeof args.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(args.date))) { console.error("--date needs a value like 2026-09-07"); process.exit(1); }
  const today = args.date || new Date().toISOString().slice(0, 10);

  if (!preflight() && !args.force) { console.error("\nPreflight failed. Fix the BLOCKED items, or pass --force with a reason recorded in the commit message."); process.exit(1); }

  // Say plainly which kind of release this is. A release with no embargo lift is legitimate — the runbook
  // allows one when the code changed in a way worth citing — but it should never happen by accident.
  if (!releasable.length) console.log("\nNote: no snapshot leaves embargo in this release. This is a code-only release; if you expected a module to be published, stop and check the output status in the Hub.");

  const changes = [];
  // package.json + CITATION.cff
  W("package.json", R("package.json").replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));
  changes.push(`package.json version → ${version}`);
  W("CITATION.cff", R("CITATION.cff").replace(/^version:.*$/m, `version: ${version}`).replace(/^date-released:.*$/m, `date-released: ${today}`));
  changes.push(`CITATION.cff version → ${version}, date-released → ${today}`);

  // CHANGELOG: Unreleased becomes the release heading
  const cl = R("CHANGELOG.md");
  if (!/## Unreleased/.test(cl)) { console.error("CHANGELOG has no Unreleased section"); process.exit(1); }
  // The embargo lift is the substance of a release like this, so it is recorded automatically.
  const lifted = [...new Set(releasable.map(s => s.module.slug))].map(slug => {
    const m = modules.find(x => x.slug === slug);
    const dates = releasable.filter(s => s.module.slug === slug).map(s => s.dir).join(", ");
    return `- Embargo lifted on Module ${String(m.number).padStart(2, "0")} ${m.short_title}: snapshot ${dates} moves from review to published now that ${(m.relationships?.companion_of || []).join(" and ")} has been submitted (Architecture §9.3).`;
  }).join("\n");
  W("CHANGELOG.md", cl.replace("## Unreleased", `## v${version} — ${title} (${today})${lifted ? "\n" + lifted : ""}`));
  changes.push(`CHANGELOG heading → v${version} — ${title} (${today})${lifted ? ", with the embargo lift recorded" : ""}`);

  // snapshots the embargo releases. Edited as text, not re-serialised: a frozen snapshot file should
  // show a one-line diff, and JSON.stringify would reindent the whole thing.
  for (const s of releasable) {
    const before = R(s.file);
    const hits = before.match(/"status":\s*"review"/g) || [];
    if (hits.length !== 1) { console.error(`${s.file}: expected exactly one "status": "review", found ${hits.length}`); process.exit(1); }
    W(s.file, before.replace(/"status":\s*"review"/, '"status": "published"'));
    changes.push(`${s.file}: review → published`);
  }

  console.log("\n## Applied\n");
  for (const c of changes) console.log(`- ${c}`);
  console.log(`\nNext: npm run validate && npm run build, commit, push, then tag v${version} and publish the GitHub release.`);
  console.log("When Zenodo has minted the version DOI: node scripts/release.mjs --doi 10.5281/zenodo.NNNNNNNN");
}

/* ---------- DOI write-back ---------- */

function writeDoi() {
  if (typeof args.doi !== "string") { console.error("--doi needs a value like 10.5281/zenodo.22546848"); process.exit(1); }
  const doi = args.doi;
  if (!/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/.test(doi)) { console.error("--doi needs a DOI like 10.5281/zenodo.22546848"); process.exit(1); }

  const name = s => `${s.module.slug}/${s.dir}`;
  const superseded = new Set(snapshots.filter(s => s.snap.supersedes).map(s => s.snap.supersedes));
  const isSuperseded = s => superseded.has(s.snap.roat_id);

  // --snapshots is resolved and fully validated before anything is written: an unknown name used to be a
  // silent no-op, and a draft or already-stamped snapshot must never be overwritten by a typo.
  let only = null;
  if (args.snapshots !== undefined) {
    if (typeof args.snapshots !== "string") { console.error("--snapshots needs a value, e.g. --snapshots=human-roles/2026-09-06"); process.exit(1); }
    only = args.snapshots.split(",").map(s => s.trim()).filter(Boolean);
    const known = new Set(snapshots.map(name));
    const unknown = only.filter(n => !known.has(n));
    if (unknown.length) { console.error(`unknown snapshot(s): ${unknown.join(", ")}\nknown: ${[...known].join(", ")}`); process.exit(1); }
    const named = snapshots.filter(s => only.includes(name(s)));
    const drafts = named.filter(s => s.snap.status === "draft");
    if (drafts.length) { console.error(`refusing to stamp a draft snapshot: ${drafts.map(name).join(", ")} — a draft is not part of any release`); process.exit(1); }
    const stamped = named.filter(s => s.snap.doi);
    if (stamped.length) { console.error(`already carries a DOI, refusing to overwrite: ${stamped.map(s => `${name(s)} → ${s.snap.doi}`).join(", ")}`); process.exit(1); }
  }

  // Default: only snapshots this release actually makes citable, i.e. published ones without a DOI, and
  // not one that a later snapshot supersedes. A snapshot still in review is offered, not written.
  const targets = only
    ? snapshots.filter(s => only.includes(name(s)))
    : snapshots.filter(s => s.snap.status === "published" && !s.snap.doi && !isSuperseded(s));
  const offered = snapshots.filter(s => !s.snap.doi && s.snap.status !== "draft" && !targets.includes(s));
  if (offered.length) {
    console.log("Candidates not written (status review, so not part of the citable record yet):");
    for (const s of offered) console.log(`- ${s.module.slug}/${s.dir} (${s.snap.status}${isSuperseded(s) ? ", superseded" : ""}) — add with --snapshots=${s.module.slug}/${s.dir} only if this release is what makes it citable`);
    console.log("");
  }
  if (!targets.length) {
    console.log("Nothing to write: every non-draft snapshot already carries a DOI.");
    console.log("A snapshot keeps the DOI of the release in which it first became citable; that is deliberate.");
    const kept = snapshots.filter(s => s.snap.doi).map(s => `${s.module.slug}/${s.dir} → ${s.snap.doi}`);
    for (const k of kept) console.log(`- ${k}`);
    return;
  }
  for (const s of targets) {
    const before = R(s.file);
    const hits = before.match(/"doi":\s*null/g) || [];
    if (hits.length !== 1) { console.error(`${s.file}: expected exactly one "doi": null, found ${hits.length}`); process.exit(1); }
    W(s.file, before.replace(/"doi":\s*null/, `"doi": ${JSON.stringify(doi)}`));
    console.log(`- ${s.file}: doi → ${doi}`);
  }
  console.log("\nNow: npm run validate && npm run build, commit, push.");
}

/* ---------- main ---------- */

if (args.doi) writeDoi();
else if (args.prepare) prepare();
else { const okAll = preflight(); process.exit(okAll ? 0 : 1); }
