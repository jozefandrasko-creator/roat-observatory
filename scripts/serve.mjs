// Tiny static server for local preview: `npm run serve` → http://localhost:8080
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../site");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".json": "application/json", ".csv": "text/csv" };
const send = (res, code, body) => { res.writeHead(code, { "content-type": "text/plain; charset=utf-8" }); res.end(body); };
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url.endsWith("/")) url += "index.html";
  let p = path.join(root, url);
  if (!path.resolve(p).startsWith(root)) return send(res, 403, "forbidden");
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return send(res, 404, "not found: " + url);
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).on("error", () => send(res, 500, "read error")).pipe(res);
}).listen(process.env.PORT || 8080, () => console.log("serving site/ on http://localhost:" + (process.env.PORT || 8080)));
