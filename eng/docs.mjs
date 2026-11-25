import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
const files = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "examples/README.md",
  "conformance/README.md",
  ...readdirSync("docs")
    .filter((n) => n.endsWith(".md"))
    .map((n) => "docs/" + n),
];
for (const path of files) {
  const text = readFileSync(path, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:)/.test(link)) continue;
    const [target, anchor] = link.split("#");
    const destination = target
      ? resolve(dirname(path), decodeURIComponent(target))
      : resolve(path);
    if (!existsSync(destination))
      throw Error(`${path}: missing local link ${link}`);
    if (anchor && destination.endsWith(".md")) {
      const headings = [
        ...readFileSync(destination, "utf8").matchAll(/^#{1,6} (.+)$/gm),
      ].map((m) =>
        m[1]
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .replace(/ /g, "-"),
      );
      if (!headings.includes(anchor))
        throw Error(`${path}: missing anchor ${link}`);
    }
  }
}
console.log("Documentation local links and anchors passed.");
