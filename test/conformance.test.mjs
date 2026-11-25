import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { canonical } from "./support.mjs";
import { fixtures } from "../eng/fixtures.mjs";
const result = canonical(fixtures());
for (const r of result.results)
  test(r.name, () => assert.equal(r.ok, true, r.error));
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/canonical.json", JSON.stringify(result, null, 2));
