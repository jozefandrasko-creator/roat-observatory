// Very small Markdown subset: headings, paragraphs, lists, bold/italic/code/links, blockquotes.
export function md(src) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = src.replace(/\r/g, "").split("\n");
  let out = [], para = [], list = null, quote = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } if (quote.length) { out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`); quote = []; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { flush(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); continue; }
    const li = l.match(/^\s*[-*]\s+(.*)/); const ol = l.match(/^\s*\d+\.\s+(.*)/);
    if (li || ol) { const t = li ? "ul" : "ol"; if (list !== t) { flush(); out.push(`<${t}>`); list = t; } out.push(`<li>${inline((li || ol)[1])}</li>`); continue; }
    if (/^\s*>\s?/.test(l)) { if (para.length || list) flush(); quote.push(l.replace(/^\s*>\s?/, "")); continue; }
    if (!l.trim()) { flush(); continue; }
    if (list) flush();
    para.push(l.trim());
  }
  flush(); return out.join("\n");
}
/** Split "---\n{json}\n---\nbody" front matter written as JSON, or plain body. */
export function splitFront(text) {
  const m = text.match(/^---json\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  return { meta: JSON.parse(m[1]), body: m[2] };
}
