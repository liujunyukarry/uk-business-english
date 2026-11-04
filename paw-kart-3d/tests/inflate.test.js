// The JS gzip fallback (for browsers without DecompressionStream, such as
// iOS Safari before 16.4) must decode exactly what zlib does.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync, gzipSync, constants } from "node:zlib";
import { gunzip } from "../dist/inflate.js";

test("decodes the shipped model archive byte for byte", () => {
  const parts = Array.from({ length: 10 }, (_, i) =>
    readFileSync(new URL(`../dist/assets/packed/dog-rules18.gz.part${String(i).padStart(2, "0")}`, import.meta.url)),
  );
  const gz = new Uint8Array(Buffer.concat(parts));
  assert.equal(Buffer.compare(Buffer.from(gunzip(gz)), gunzipSync(gz)), 0);
});

test("stored, fixed-Huffman and dynamic blocks", () => {
  const samples = [
    Buffer.alloc(0),
    Buffer.from("a"),
    Buffer.from("hello hello hello hello hello"),
    Buffer.alloc(200000, 7),
    Buffer.from(Array.from({ length: 70000 }, (_, i) => (i * 7919) & 255)),
  ];
  for (const [i, s] of samples.entries())
    for (const level of [0, 1, 9]) {
      const z = gzipSync(s, { level, strategy: i === 2 ? constants.Z_FIXED : constants.Z_DEFAULT_STRATEGY });
      assert.equal(Buffer.compare(Buffer.from(gunzip(new Uint8Array(z))), s), 0, `sample ${i} level ${level}`);
    }
});
