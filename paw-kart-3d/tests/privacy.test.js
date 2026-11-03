// Privacy guard: nothing personal ships in this folder. The checks are
// generic patterns only (no personal value is written here): e-mail
// addresses, phone numbers, access tokens and keys, absolute home-directory
// paths, links to personal sites or accounts, and photo metadata in images.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
// Third-party code and binary model data are not ours to scan.
const SKIP = new Set(["node_modules", ".git", "vendor", "packed"]);
const TEXT = new Set([".js", ".mjs", ".html", ".css", ".md", ".json", ".txt", ".svg"]);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
})(ROOT);

// Owners of third-party repositories credited in docs/ASSET_PROVENANCE.md.
const CREDITED = new Set(["mrdoob", "Jolomolokolo", "KenneyNL"]);
const RULES = [
  ["e-mail address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
  ["phone number", /(?<![\w.])(\+?86[- ]?)?1[3-9]\d{9}(?![\w.])/g],
  ["access token or key", /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abp]-[A-Za-z0-9-]{10,})|-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["home-directory path", /(\/Users\/[^/\s"'`]+\/|\/home\/[a-z][^/\s"'`]*\/|[A-Z]:\\Users\\)/g],
  ["personal site link", /[a-z0-9-]+\.(github\.io|chatgpt\.site|vercel\.app|netlify\.app)\b/gi],
];

test("no personal details in source, tests, tools or docs", () => {
  const found = [];
  for (const file of files) {
    if (!TEXT.has(extname(file)) || file.endsWith("package-lock.json")) continue;
    const text = readFileSync(file, "utf8"),
      where = relative(ROOT, file);
    for (const [what, re] of RULES)
      for (const m of text.matchAll(re)) found.push(`${where}: ${what} "${m[0]}"`);
    for (const m of text.matchAll(/github\.com\/([A-Za-z0-9-]+)/g))
      if (!CREDITED.has(m[1])) found.push(`${where}: account link "${m[0]}"`);
  }
  assert.deepEqual(found, []);
});

test("images and videos carry no camera, location or author metadata", () => {
  const found = [];
  for (const file of files) {
    const ext = extname(file).toLowerCase(),
      where = relative(ROOT, file);
    if (ext === ".jpg" || ext === ".jpeg") {
      const b = readFileSync(file);
      // An APP1 segment starting "Exif" (camera, GPS, author fields).
      for (let i = 2; i + 10 < b.length && b[i] === 0xff; ) {
        const marker = b[i + 1],
          size = b.readUInt16BE(i + 2);
        if (marker === 0xe1 && b.toString("latin1", i + 4, i + 8) === "Exif") found.push(where + ": EXIF block");
        if (marker === 0xda) break; // image data starts
        i += 2 + size;
      }
    } else if (ext === ".png") {
      const b = readFileSync(file);
      for (let i = 8; i + 8 < b.length; ) {
        const len = b.readUInt32BE(i),
          type = b.toString("latin1", i + 4, i + 8);
        if (["eXIf", "tEXt", "iTXt", "zTXt"].includes(type)) found.push(`${where}: ${type} chunk`);
        i += 12 + len;
      }
    } else if (ext === ".mp4" || ext === ".mov") {
      const text = readFileSync(file).toString("latin1");
      for (const tag of ["©xyz", "©ART", "©aut", "com.apple.quicktime.location"])
        if (text.includes(tag)) found.push(`${where}: ${JSON.stringify(tag)} tag`);
    }
  }
  assert.deepEqual(found, []);
});
