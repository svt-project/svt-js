import { readFileSync, readdirSync } from "node:fs";
export function fixtures() {
  return {
    inspection: readdirSync("conformance/inspection")
      .sort()
      .map((name) => ({
        name,
        source: readFileSync(
          `conformance/inspection/${name}/input.svg`,
          "utf8",
        ),
        expected: JSON.parse(
          readFileSync(`conformance/inspection/${name}/expected.json`),
        ),
      })),
    substitution: readdirSync("conformance/substitution")
      .sort()
      .map((name) => ({
        name,
        source: readFileSync(
          `conformance/substitution/${name}/input.svg`,
          "utf8",
        ),
        expected: readFileSync(
          `conformance/substitution/${name}/output.svg`,
          "utf8",
        ),
        bindings: JSON.parse(
          readFileSync(`conformance/substitution/${name}/bindings.json`),
        ).bindings,
      })),
  };
}
