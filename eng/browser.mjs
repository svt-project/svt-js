import { build } from "esbuild";
import { chromium, firefox, webkit } from "playwright";
import http from "node:http";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtures } from "./fixtures.mjs";
const [engine = "chromium", ...extra] = process.argv.slice(2);
if (extra.length || !["chromium", "firefox", "webkit"].includes(engine))
  throw new Error("Usage: node eng/browser.mjs [chromium|firefox|webkit]");

mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/fixtures.json", JSON.stringify(fixtures()));
await build({
  entryPoints: ["test/worker.mjs"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  outfile: "artifacts/worker.js",
  metafile: true,
}).then((r) =>
  writeFileSync(
    "artifacts/browser-bundle.json",
    JSON.stringify(r.metafile, null, 2),
  ),
);
const iframeBundle = await build({
  entryPoints: ["test/iframe.mjs"],
  bundle: true,
  format: "esm",
  write: false,
});
const server = http.createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><title>SVT Worker validation</title><script>const w=new Worker("/worker.js",{type:"module"});w.onmessage=e=>{window.result=e.data;w.terminate()};w.onerror=e=>{window.failure=e.message;w.terminate()};</script>',
    );
    return;
  }
  if (req.url === "/iframe.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(iframeBundle.outputFiles[0].contents);
    return;
  }
  if (req.url === "/worker.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(readFileSync("artifacts/worker.js"));
    return;
  }
  res.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
let firefoxAppData;
try {
  if (engine === "firefox") {
    // Firefox consults its app-data directory even with a temporary Playwright
    // profile. Give the test its own directory so it can launch on macOS.
    firefoxAppData = mkdtempSync(join(tmpdir(), "svt-firefox-"));
    browser = await firefox.launch({
      env: { ...process.env, MOZ_APP_DATA: firefoxAppData },
    });
  } else if (engine === "webkit") {
    browser = await webkit.launch();
  } else {
    browser = await chromium.launch({
      executablePath: process.env.SVT_CHROME_PATH,
    });
  }
  const context = await browser.newContext(),
    origin = "http://127.0.0.1:" + server.address().port,
    unexpected = [];
  await context.route("**/*", async (route) => {
    if (
      [origin + "/", origin + "/worker.js", origin + "/iframe.js"].includes(
        route.request().url(),
      )
    )
      await route.continue();
    else {
      unexpected.push(route.request().url());
      await route.abort();
    }
  });
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () =>
    (await import("/iframe.js")).checkIframeBytes(),
  );
  console.log("Iframe template inspection and image byte binding passed.");
  await page.waitForFunction(
    () => window.result || window.failure,
    {},
    { timeout: 30000 },
  );
  const result = await page.evaluate(
    () => window.result ?? { ok: false, error: window.failure },
  );
  writeFileSync(
    engine === "chromium"
      ? "artifacts/browser.json"
      : `artifacts/${engine}.json`,
    JSON.stringify(
      { ...result, engine, browser: browser.version(), unexpected },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        engine,
        browser: browser.version(),
        worker: result.worker,
        passed: result.results?.filter((r) => r.ok).length,
        failures: result.results?.filter((r) => !r.ok),
        error: result.error,
        unexpected,
      },
      null,
      2,
    ),
  );
  if (
    !result.ok ||
    unexpected.length ||
    result.worker !== "DedicatedWorkerGlobalScope"
  )
    process.exitCode = 1;
} finally {
  try {
    await browser?.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (firefoxAppData)
      rmSync(firefoxAppData, { recursive: true, force: true });
  }
}
