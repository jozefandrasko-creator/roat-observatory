// HTML templates for the Observatory build. Plain functions, no framework.
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export { esc };

/** JSON-LD block for the page head; `data` is a plain object (schema.org). */
export const jsonld = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

export function layout({ title, body, nav, draft, site, path: current = "/", description = "", head = "" }) {
  const items = [["/", "Observatory"], ["/modules/", "Modules"], ["/jurisdictions/", "Jurisdictions"], ["/sources/", "Sources"], ["/research/", "Research"], ["/method/", "Method"]];
  const canonical = site.origin ? `${site.origin}${site.base}${current.replace(/^\//, "")}` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ROAT Observatory</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${site.base}styles.css">
${head}
</head>
<body>
${draft ? `<div class="draft-banner">DRAFT BUILD — validation gates not passed; nothing on this build is citable</div>` : ""}
<header class="site-head"><div class="wrap">
  <a class="brand" href="${site.base}">ROAT Observatory<small>How law lets automated vehicles onto the road</small></a>
  <nav class="site">${items.map(([p, l]) => `<a href="${site.base}${p.slice(1)}"${(p === "/" ? current === "/" : current.startsWith(p)) ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
  <span>ROAT · Faculty of Law, Comenius University Bratislava · content CC BY 4.0 · code MIT</span>
  <span>Built ${esc(site.built)} from Hub export of ${esc(site.hubExported)}</span>
</div></footer>
<div class="tip" id="tip"></div>
<script>
(function(){
  const tip=document.getElementById('tip');
  document.querySelectorAll('[data-t]').forEach(el=>{el.addEventListener('mouseenter',e=>{tip.textContent=el.dataset.t;tip.style.display='block';mv(e)});el.addEventListener('mousemove',mv);el.addEventListener('mouseleave',()=>tip.style.display='none')});
  function mv(e){tip.style.left=Math.min(e.clientX+14,window.innerWidth-280)+'px';tip.style.top=(e.clientY+14)+'px'}
  document.querySelectorAll('tr.row[data-detail]').forEach(tr=>{
    const open=()=>{const d=document.getElementById(tr.dataset.detail);const was=d.classList.contains('open');tr.closest('table').querySelectorAll('.rowdetail.open').forEach(x=>x.classList.remove('open'));tr.closest('table').querySelectorAll('tr.row.open').forEach(x=>x.classList.remove('open'));if(!was){d.classList.add('open');tr.classList.add('open')}};
    tr.addEventListener('click',open);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
  document.querySelectorAll('tr.row[data-open]').forEach(tr=>tr.click());
})();
</script>
</body>
</html>`;
}

/* ---------- pieces ---------- */
export const chips = (ids, site, sources) => `<div class="chips">${ids.map(id => {
  const s = sources[id];
  return s ? `<a class="chip" href="${site.base}sources/${id.toLowerCase()}/" title="${esc(s.title)}">${esc(id)}</a>` : `<span class="chip" title="Not yet in the public Source Library">${esc(id)}</span>`;
}).join("")}</div>`;

export const nCell = (v, label, regime, vocab) => v == null ? `<td class="cell"><span class="n n0" data-t="not coded">–</span></td>` :
  `<td class="cell"><span class="n n${v}" data-t="${esc(regime)} · ${esc(label)}: N${v} — ${esc(vocab.n_scale[v].label)}">N${v}</span></td>`;

/** A role-function cell is a polarity token plus an optional qualifier that carries the legal condition.
 *  The chip colour comes from the polarity; the qualifier is kept verbatim and marks the chip as qualified. */
export const rolePolarity = v => {
  const t = String(v || "").trim();
  if (!t) return { cls: "none", qualified: false, text: "" };
  const head = t.split(/[\s/–-]/)[0].toLowerCase();
  const cls = head === "yes" ? "yes" : (head === "no" || head === "not") ? "no"
            : (/^(system|self-monitoring|technical)/i.test(t) ? "sys" : "cond");
  const bare = /^(yes|no|system)$/i.test(t);
  return { cls, qualified: !bare && cls !== "cond", text: t };
};
export const roleCell = v => {
  const p = rolePolarity(v);
  if (!p.text) return `<td class="cell"><span class="role none" data-t="not coded">–</span></td>`;
  return `<td><span class="role ${p.cls}${p.qualified ? " qual" : ""}" data-t="${esc(p.text)}">${esc(p.text.length > 20 ? p.text.slice(0, 18) + "…" : p.text)}</span></td>`;
};
export const legendRoles = () => `<div class="legend">${[["yes","Yes — the role performs this function"],["no","No — it does not"],["sys","System — performed by the ADS, not a person"],["cond","Qualified — the cell states the condition"],["none","Not coded"]].map(([c,l])=>`<span class="k"><span class="role ${c}">${c === "cond" ? "…" : c === "none" ? "–" : c}</span><span>${l}</span></span>`).join("")}<span class="k" style="max-width:340px"><span class="role yes qual">Yes …</span><span>An outlined chip is a qualified answer: read the cell text, not the colour.</span></span></div>`;

export const legendN = vocab => `<div class="legend">${vocab.n_scale.map(n => `<div class="k"><span class="sw n${n.value}">N${n.value}</span><span>${esc(n.label)}</span></div>`).join("")}</div>`;

export function detailRows(r, mod, site, sources, vocab) {
  const parts = [];
  for (const d of mod.dimensions) {
    const v = r[d.key]; if (v == null || v === "") continue;
    parts.push(`<div><dt>${esc(d.label)}</dt><dd>${d.scale === "n-scale" ? `N${v} — ${esc(vocab.n_scale[v].label)}` : esc(v)}</dd></div>`);
  }
  const extra = [["Primary current-law rationale", r.rationale], ["Dominant legal bridge / gate", r.bridge], ["Sensitivity range", r.sensitivity], ["Robust conclusion", r.robust_conclusion], ["Important caveat", r.caveat], ["Interpretation", r.interpretation], ["Verification status", r.verification], ["Term", r.term], ["Framework", r.framework]];
  for (const [k, v] of extra) if (v) parts.push(`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`);
  if (r.extra) for (const [k, v] of Object.entries(r.extra)) parts.push(`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`);
  if (r.confidence) parts.push(`<div><dt>Confidence</dt><dd>${esc(r.confidence)}</dd></div>`);
  parts.push(`<div><dt>Core ROAT records</dt><dd>${r.records?.length ? chips(r.records, site, sources) : '<span class="muted">none</span>'}</dd></div>`);
  return `<div class="grid">${parts.join("")}</div>`;
}

/** Generic module table: n-scale dims as heat cells, role dims as chips, text dims → only summary columns; detail row per regime. */
export function moduleTable(mod, data, { site, sources, vocab, idPrefix, defaultOpen }) {
  const nDims = mod.dimensions.filter(d => d.scale === "n-scale");
  const roleDims = mod.dimensions.filter(d => d.scale === "role-value");
  const sumDims = mod.dimensions.filter(d => d.scale === "text" && d.summary);
  const isMatrix = nDims.length > 0, isRoles = roleDims.length > 0;
  const cls = isMatrix ? "matrix" : "sg";
  const head = isMatrix
    ? `<th>Regime</th>${nDims.map(d => `<th class="layer">${esc(d.label)}</th>`).join("")}<th>Range · asynchrony</th><th>Configuration family</th>`
    : isRoles ? `<th>Role / function</th><th>Framework</th>${roleDims.map(d => `<th>${esc(d.label)}</th>`).join("")}`
    : `<th>Regime</th>${sumDims.map(d => `<th>${esc(d.label.replace("Additional deployment / road-use gate", "Deployment gate"))}</th>`).join("")}<th>Confidence</th>`;
  const groups = [["current", `Current law · snapshot ${data.snapshot_date}`], ["historical", "Historical panel · United Kingdom 1861–1930"], ["longitudinal", "Longitudinal panel · 2018–2026"], ["prospective", "Sensitivity · prospective law (not current-law scores)"]];
  let body = "";
  let i = 0;
  for (const [panel, label] of groups) {
    const rows = data.rows.filter(r => (r.panel || "current") === panel);
    if (!rows.length) continue;
    if (data.rows.some(r => r.panel && r.panel !== "current")) body += `<tr class="group"><td colspan="${(isMatrix ? nDims.length + 3 : isRoles ? roleDims.length + 2 : sumDims.length + 2)}">${label}</td></tr>`;
    for (const r of rows) {
      const did = `${idPrefix}-d${i++}`;
      const open = defaultOpen && r.regime_id === defaultOpen ? ' data-open="1"' : "";
      let cells;
      if (isMatrix) cells = `<td class="name">${esc(r.regime_label)}<small>${esc(r.bridge || r.interpretation || "")}</small></td>${nDims.map(d => nCell(r[d.key], d.label, r.regime_label, vocab)).join("")}<td class="meta">${r.range != null && !isNaN(r.range) ? `<b>${r.range}</b> · ${esc(r.asynchrony)}` : `<span class="result${/SHIFT/.test(r.result || "") ? " shift" : ""}">${esc(r.result || "")}</span>`}</td><td class="meta">${esc(r.family || r.interpretation || "")}</td>`;
      else if (isRoles) cells = `<td class="j">${esc(r.regime_label)}<br><small class="muted">${esc(r.regime_id)}</small></td><td class="muted" style="font-size:13px">${esc(r.framework || "")}</td>${roleDims.map(d => roleCell(r[d.key])).join("")}`;
      else cells = `<td class="j">${esc(r.regime_label)}</td>${sumDims.map(d => `<td>${esc(r[d.key])}</td>`).join("")}<td class="status">${esc(r.confidence || "")}</td>`;
      body += `<tr class="row${panel === "prospective" ? " prosp" : ""}" tabindex="0" data-detail="${did}"${open}>${cells}</tr>`;
      body += `<tr class="rowdetail" id="${did}"><td colspan="${(isMatrix ? nDims.length + 3 : isRoles ? roleDims.length + 2 : sumDims.length + 2)}"><h3 style="font-family:var(--serif);font-size:19px;margin:0 0 10px">${esc(r.regime_label)}${r.family ? ` <span class="badge">${esc(r.family)}</span>` : ""}${panel === "prospective" ? ' <span class="badge prospective">prospective</span>' : ""}</h3>${detailRows(r, mod, site, sources, vocab)}</td></tr>`;
    }
  }
  return `<div class="tblwrap"><table class="${cls}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${isMatrix ? legendN(vocab) : (isRoles ? legendRoles() : "")}`;
}

export const cards = items => `<div class="cards">${items.map(c => `<div class="card">${c.lab ? `<p class="lab">${esc(c.lab)}</p>` : ""}<h3>${c.href ? `<a href="${c.href}" style="border:0;color:inherit">${esc(c.title)}</a>` : esc(c.title)}</h3>${c.lines.map(l => l.lab ? `<p class="lab">${esc(l.lab)}</p><p${l.cls ? ` class="${l.cls}"` : ""}>${esc(l.text)}</p>` : `<p>${esc(l)}</p>`).join("")}</div>`).join("")}</div>`;

export function citeBlock({ module, snap, site, url }) {
  return `<div class="note" style="margin-top:28px;border-top:1px solid var(--rule);padding-top:14px"><p class="module">Cite this snapshot</p><p>ROAT Observatory, <em>${esc(module.title)}</em> [<code>${esc(module.roat_id)}</code>], snapshot ${esc(snap.snapshot_date)} [<code>${esc(snap.roat_id)}</code>]${snap.doi ? `, DOI ${esc(snap.doi)}` : ", no DOI yet"}. Faculty of Law, Comenius University Bratislava. ${esc(url)}</p></div>`;
}
