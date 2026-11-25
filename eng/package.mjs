import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const npm = (args, opts = {}) =>
  process.env.npm_execpath
    ? execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
        encoding: "utf8",
        ...opts,
      })
    : execFileSync("npm", args, { encoding: "utf8", ...opts });
mkdirSync("artifacts", { recursive: true });
const [pack] = JSON.parse(
  npm([
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    "artifacts",
  ]),
);
const paths = new Set(pack.files.map((f) => f.path));
for (const p of [
  "dist/index.js",
  "dist/index.d.ts",
  "LICENSE",
  "THIRD-PARTY-NOTICES.txt",
  "conformance/SNAPSHOT.json",
  "CHANGELOG.md",
  "examples/template.svg",
  "examples/live-preview/controller.js",
])
  assert.ok(paths.has(p), p);
for (const p of paths)
  assert.ok(!/^(?:\.local|node_modules|artifacts|test|src)\//.test(p), p);
const consumer = mkdtempSync("artifacts/package-consumer-");
writeFileSync(
  consumer + "/package.json",
  JSON.stringify({ private: true, type: "module" }),
);
npm(
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    resolve("artifacts", pack.filename),
  ],
  { cwd: consumer },
);
writeFileSync(
  consumer + "/consume.mjs",
  `import assert from 'node:assert/strict';import {inspect} from '@svt-project/svt-js';const r=inspect('<svg xmlns="http://www.w3.org/2000/svg" data-svt-version="1.0"><text data-svt-text="a">old</text></svg>');assert.equal(r.ok,true);const b=r.value.bind([{key:'a',kind:'text',value:'new'}]);assert.equal(b.ok,true);assert.ok(b.value.svg.includes('>new</text>'));`,
);
execFileSync(process.execPath, ["consume.mjs"], {
  cwd: consumer,
  stdio: "inherit",
});
const types = readFileSync("test/types/consumer.ts", "utf8").replace(
  "../../dist/index.js",
  "@svt-project/svt-js",
);
writeFileSync(consumer + "/consumer.ts", types);
writeFileSync(
  consumer + "/tsconfig.json",
  readFileSync("test/types/tsconfig.json"),
);
execFileSync(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "-p",
    resolve(consumer, "tsconfig.json"),
  ],
  { stdio: "inherit" },
);
execFileSync(
  process.execPath,
  ["node_modules/@svt-project/svt-js/examples/node/bind.mjs"],
  { cwd: consumer, stdio: "inherit" },
);
writeFileSync(
  "artifacts/package.json",
  JSON.stringify({ pack, consumer, status: "passed" }, null, 2),
);
console.log(
  "Packed ESM runtime and strict declaration consumer passed; no registry publication.",
);
