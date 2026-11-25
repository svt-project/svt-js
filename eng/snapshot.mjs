import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../conformance/", import.meta.url);
const json = (name) => JSON.parse(readFileSync(new URL(name, root), "utf8"));
const manifest = json("manifest.json"),
  stamp = json("SNAPSHOT.json");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const entries = Object.entries(manifest.files).sort(([a], [b]) =>
  a < b ? -1 : a > b ? 1 : 0,
);
for (const [path, digest] of entries)
  assert.equal(hash(readFileSync(new URL(path, root))), digest, path);
assert.equal(
  hash(entries.map(([p, h]) => p + "\0" + h + "\n").join("")),
  manifest.sha256,
);
for (const key of ["specification_version", "template_format", "sha256"])
  assert.equal(manifest[key], stamp[key]);
assert.match(stamp.commit, /^[0-9a-f]{40}$/);
const actual = [];
function walk(path = "") {
  for (const e of readdirSync(new URL(path, root), { withFileTypes: true })) {
    const p = path + e.name;
    if (e.isDirectory()) walk(p + "/");
    else if (!["README.md", "manifest.json", "SNAPSHOT.json"].includes(p))
      actual.push(p);
  }
}
walk();
assert.deepEqual(
  actual.sort(),
  entries.map(([p]) => p),
);
console.log(`Verified ${entries.length} stamped assets from ${stamp.commit}.`);
