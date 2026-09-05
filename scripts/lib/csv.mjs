// Minimal RFC 4180 CSV reader/writer (no dependencies).
export function parseCSV(text) {
  const rows = []; let row = []; let field = ""; let i = 0; let inQ = false;
  text = text.replace(/^﻿/, "");
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
export function toCSV(rows) {
  const q = v => { v = v == null ? "" : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return rows.map(r => r.map(q).join(",")).join("\n") + "\n";
}
/** Table with a header row at index `headerRow`; returns objects until the first row whose first cell is empty. */
export function tableAt(rows, headerRow, { stopAtBlank = true, stopWhen = null } = {}) {
  const hdr = rows[headerRow].map(h => h.trim());
  const out = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const line = rows[r];
    if (!line || !line.some(c => c && c.trim())) { if (stopAtBlank) break; else continue; }
    if (!line[0] || !line[0].trim()) { if (stopAtBlank) break; else continue; }
    if (stopWhen && stopWhen(line)) break;
    const o = {}; hdr.forEach((h, i) => { if (h) o[h] = (line[i] ?? "").trim(); });
    out.push(o);
  }
  return { header: hdr.filter(Boolean), rows: out };
}
export function findRow(rows, predicate) { return rows.findIndex(r => r && predicate(r)); }
