// The published build must load as one consistent version: every local
// module URL carries the same, current content stamp (see tools/stamp.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIST, buildId, sources } from "../tools/stamp.mjs";

test("every local import and the stylesheet carry the current build stamp", () => {
  const id = buildId(),
    stale = [];
  for (const f of sources()) {
    const text = readFileSync(join(DIST, f), "utf8");
    for (const m of text.matchAll(/(?:from\s*|import\s*\(\s*)["']\.\/((?!vendor\/)[\w-]+\.js)(\?v=[\w]+)?["']/g))
      if (m[2] !== "?v=" + id) stale.push(`${f}: ./${m[1]}${m[2] || ""}`);
    for (const m of text.matchAll(/href=["']style\.css(\?v=[\w]+)?["']/g))
      if (m[1] !== "?v=" + id) stale.push(`${f}: style.css${m[1] || ""}`);
  }
  assert.deepEqual(stale, [], `run "npm run stamp" (build ${id})`);
  assert.match(readFileSync(join(DIST, "index.html"), "utf8"), new RegExp(`<meta name="paw-build" content="${id}">`));
});
