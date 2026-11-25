import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inspect } from "@svt-project/svt-js";

// The host reads files; the library only receives XML and replacement bytes.
const source = await readFile(new URL("../template.svg", import.meta.url));
const inspection = inspect(source);
if (!inspection.ok) throw new Error(inspection.error.message);
const template = inspection.value;
console.table(
  template.inputs.map(({ key, kind, label }) => ({ key, kind, label })),
);

const artwork = await readFile(new URL("../artwork.svg", import.meta.url));
const result = template.bind([
  { key: "heading", kind: "text", value: "Trail photography" },
  { key: "accent", kind: "paint", value: "#336699" },
  {
    key: "artwork",
    kind: "image-content",
    bytes: artwork,
    mediaType: "image/svg+xml",
  },
]);
if (!result.ok) throw new Error(result.error.message);
const output = resolve(process.argv[2] ?? "artifacts/examples/invitation.svg");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, result.value.toUtf8());
console.log(`Wrote ${output}`);
