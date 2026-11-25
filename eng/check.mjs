import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const [command, args] of [
  ["git", ["diff", "--check"]],
  ["git", ["diff", "--cached", "--check"]],
  ["node", ["eng/snapshot.mjs"]],
  ["node", ["eng/docs.mjs"]],
  [
    "node",
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      "src",
      "test",
      "eng",
      "docs",
      "examples",
      "CHANGELOG.md",
      "SECURITY.md",
      "README.md",
      "AGENTS.md",
      "CONTRIBUTING.md",
      "conformance/README.md",
      "package.json",
      "tsconfig.json",
    ],
  ],
  ["node", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]],
  [
    "node",
    ["node_modules/typescript/bin/tsc", "-p", "test/types/tsconfig.json"],
  ],
  ["node", ["eng/coverage.mjs"]],
  ["python3", ["eng/independent.py"]],
  ["node", ["eng/examples.mjs"]],
  ["node", ["eng/package.mjs"]],
]) {
  console.log("> " + command + " " + args.join(" "));
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}
