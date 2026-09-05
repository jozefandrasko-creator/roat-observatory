#!/usr/bin/env node
// review-queue — what the Observatory needs re-verified, in the format of the ROAT Monday review.
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and resolves to "C:\\C:\\..."
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const today = new Date(process.argv[2] || Date.now());
const days = d => Math.round((today - new Date(d)) / 86400000);
const index = J("data/hub/register-index.json").records;
const out = [`# Observatory review queue — ${today.toISOString().slice(0, 10)}`, ""];
const items = [];
for (const f of fs.readdirSync(path.join(ROOT, "content/modules")).filter(f => f.endsWith(".json"))) {
  const m = J(`content/modules/${f}`); const dir = path.join(ROOT, "data/modules", m.slug);
  if (!fs.existsSync(dir)) continue;
  const latest = fs.readdirSync(dir).sort().pop(); const data = JSON.parse(fs.readFileSync(path.join(dir, latest, "data.json"), "utf8"));
  const age = days(data.snapshot_date);
  if (age > 180) items.push({ tier: "A", what: `${m.slug}: latest snapshot ${data.snapshot_date} is ${age} days old`, action: "Re-code in the Hub sheet and freeze a new snapshot" });
  const recs = [...new Set(data.rows.flatMap(r => r.records || []))];
  for (const id of recs) {
    const r = index[id]; if (!r) continue;
    if (r.next_check && new Date(r.next_check) < today) items.push({ tier: "B", what: `${m.slug} cites ${id} whose Hub Next Check Date ${r.next_check} is overdue`, action: "Run the Hub monitoring check; re-verify the citing cells if the source changed" });
    if (r.public_status !== "Published") items.push({ tier: "C", what: `${m.slug} cites ${id} (Public Status: ${r.public_status || "empty"})`, action: "Move through the Public Editorial Queue" });
  }
}
for (const f of fs.readdirSync(path.join(ROOT, "content/jurisdictions")).filter(f => f.endsWith(".json"))) {
  const j = J(`content/jurisdictions/${f}`); const age = days(j.last_verified);
  if (age > 90) items.push({ tier: "B", what: `${j.slug}: overview last verified ${j.last_verified} (${age} days)`, action: "Re-read the overview against the latest snapshots and Hub records" });
}
for (const t of ["A", "B", "C"]) { const x = items.filter(i => i.tier === t); if (!x.length) continue; out.push(`## Tier ${t} (${x.length})`, ""); for (const i of x) out.push(`- ${i.what} — *${i.action}*`); out.push(""); }
if (!items.length) out.push("Nothing due.");
console.log(out.join("\n"));
