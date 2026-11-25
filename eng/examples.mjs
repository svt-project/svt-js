import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const output = "artifacts/examples/live-preview";
export async function buildExamples() {
  mkdirSync(output, { recursive: true });
  await build({
    entryPoints: [
      "examples/live-preview/main.js",
      "examples/live-preview/worker.js",
    ],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    outdir: output,
  });
  copyFileSync("examples/live-preview/index.html", `${output}/index.html`);
  copyFileSync("examples/template.svg", `${output}/template.svg`);
}
export async function serveExamples(port = 0) {
  const files = new Map([
    ["/", ["index.html", "text/html"]],
    ["/main.js", ["main.js", "text/javascript"]],
    ["/worker.js", ["worker.js", "text/javascript"]],
    ["/template.svg", ["template.svg", "image/svg+xml"]],
  ]);
  const server = createServer((request, response) => {
    const file = files.get(new URL(request.url, "http://localhost").pathname);
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", file[1]);
    response.setHeader("Cache-Control", "no-store");
    response.end(readFileSync(`${output}/${file[0]}`));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await buildExamples();
  if (process.argv.includes("--serve")) {
    const { server, origin } = await serveExamples(8787);
    console.log(`Live preview: ${origin}`);
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => server.close());
  } else console.log("Built browser Worker example.");
}
