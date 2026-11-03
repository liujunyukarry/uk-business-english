// Stamp every local module and the stylesheet with a content hash:
//   import ... from "./art.js?v=1a2b3c4d"
// Run `npm run stamp` after changing anything in dist/ (npm test fails when
// the stamp is stale). Why: static hosts such as GitHub Pages let browsers
// cache files for minutes; without versioned URLs a reload right after an
// update can mix old and new modules and fail to load. Vendor files and
// assets do not change between releases and keep their plain URLs.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const LOCAL = /((?:from\s*|import\s*\(\s*)["'])\.\/((?!vendor\/)[\w-]+\.js)(\?v=[\w]+)?(["'])/g;
const STYLE = /(href=["'])(style\.css)(\?v=[\w]+)?(["'])/g;
const META = /\s*<meta name="paw-build" content="[\w]*">/;

export const sources = () => [
  "index.html",
  "style.css",
  ...readdirSync(DIST)
    .filter((f) => f.endsWith(".js"))
    .sort(),
];
// The content with every stamp removed: what the hash is computed from.
export const normalise = (text) =>
  text.replace(LOCAL, "$1./$2$4").replace(STYLE, "$1$2$4").replace(META, "");
export function buildId() {
  const h = createHash("sha256");
  for (const f of sources()) h.update(f + "\n" + normalise(readFileSync(join(DIST, f), "utf8")) + "\n");
  return h.digest("hex").slice(0, 8);
}
export function stamp(id = buildId()) {
  for (const f of sources()) {
    const path = join(DIST, f),
      before = readFileSync(path, "utf8");
    let after = normalise(before)
      .replace(LOCAL, `$1./$2?v=${id}$4`)
      .replace(STYLE, `$1$2?v=${id}$4`);
    if (f === "index.html") after = after.replace(/(<meta charset="utf-8">)/, `$1<meta name="paw-build" content="${id}">`);
    if (after !== before) writeFileSync(path, after);
  }
  return id;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log("build " + stamp());
