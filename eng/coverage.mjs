import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const directory = "artifacts/coverage";
mkdirSync(directory, { recursive: true });
execFileSync(
  process.execPath,
  [
    "--enable-source-maps",
    "--experimental-test-coverage",
    "--test-reporter=spec",
    "--test-reporter-destination=stdout",
    "--test-reporter=lcov",
    `--test-reporter-destination=${directory}/all.info`,
    "--test",
    ...readdirSync("test")
      .filter((name) => name.endsWith(".test.mjs"))
      .map((name) => `test/${name}`),
  ],
  { stdio: "inherit" },
);
// Node remaps the compiled code through inline source maps. Keep only library sources;
// host examples, fixtures and third-party code do not count toward library coverage.
const records = readFileSync(`${directory}/all.info`, "utf8")
  .split("end_of_record\n")
  .filter((record) => /^SF:src\/[^/]+\.ts$/m.test(record));
const names = records.map((record) => record.match(/^SF:(.+)$/m)[1]).sort();
const expected = readdirSync("src")
  .filter((name) => name.endsWith(".ts") && name !== "model.ts")
  .map((name) => `src/${name}`)
  .sort();
assert.deepEqual(
  names,
  expected,
  "Every executable library module must have source-mapped coverage.",
);
const report = records.map((record) => `${record}end_of_record\n`).join("");
writeFileSync(`${directory}/lcov.info`, report);
const sum = (field) =>
  [...report.matchAll(new RegExp(`^${field}:(\\d+)$`, "gm"))].reduce(
    (total, match) => total + Number(match[1]),
    0,
  );
const summary = {};
for (const [kind, found, hit] of [
  ["lines", "LF", "LH"],
  ["branches", "BRF", "BRH"],
  ["functions", "FNF", "FNH"],
]) {
  const total = sum(found),
    covered = sum(hit);
  assert.ok(total > 0, `Missing ${kind} coverage`);
  summary[kind] = {
    covered,
    total,
    percent: Number(((covered / total) * 100).toFixed(2)),
  };
}
writeFileSync(
  `${directory}/summary.json`,
  JSON.stringify({ files: names, ...summary }, null, 2) + "\n",
);
console.log("Library coverage:", summary);
