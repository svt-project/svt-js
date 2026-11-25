import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { buildExamples, serveExamples } from "./examples.mjs";
await buildExamples();
const { server, origin } = await serveExamples();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SVT_CHROME_PATH
      ? { executablePath: process.env.SVT_CHROME_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1000, height: 720 },
  });
  const errors = [],
    unexpected = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      !request.url().startsWith(origin + "/") &&
      !request.url().startsWith("blob:")
    )
      unexpected.push(request.url());
  });
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.requests = [];
    window.terminations = 0;
    window.liveUrls = new Set();
    const createUrl = URL.createObjectURL.bind(URL);
    const revokeUrl = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createUrl(blob);
      window.liveUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.liveUrls.delete(url);
      revokeUrl(url);
    };
    window.Worker = class extends NativeWorker {
      postMessage(message) {
        window.requests.push(message);
        super.postMessage(message);
      }
      terminate() {
        window.terminations++;
        super.terminate();
      }
    };
  });
  await page.goto(origin);
  let previousUrl;
  const waitForText = async (text) => {
    await page.waitForFunction(
      (previous) => {
        const image = document.querySelector("#preview");
        return (
          image.src.startsWith("blob:") &&
          image.src !== previous &&
          image.complete &&
          image.naturalWidth > 0 &&
          document.querySelector("#status").textContent === "Preview updated"
        );
      },
      previousUrl,
      { timeout: 15000 },
    );
    const result = await page.evaluate(async () => {
      const image = document.querySelector("#preview");
      const source = await (await fetch(image.src)).text();
      return {
        url: image.src,
        text: new DOMParser()
          .parseFromString(source, "image/svg+xml")
          .querySelector('[data-svt-text="heading"]').textContent,
      };
    });
    assert.equal(result.text, text);
    previousUrl = result.url;
  };
  await waitForText("Make it yours");
  const before = await page.evaluate(() => window.requests.length);
  await page.evaluate(() => {
    const input = document.querySelector("#heading");
    for (const value of ["first", "discarded", "latest <&>"]) {
      input.value = value;
      input.dispatchEvent(new Event("input"));
    }
  });
  await waitForText("latest <&>");
  assert.equal(await page.evaluate(() => window.requests.length), before + 2);
  await page.evaluate(() => {
    const input = document.querySelector("#heading");
    input.value = "must not publish";
    input.dispatchEvent(new Event("input"));
    document.querySelector("#cancel").click();
  });
  assert.match(await page.locator("#status").textContent(), /Canceled/);
  assert.equal(await page.evaluate(() => window.terminations), 1);
  await page.locator("#heading").fill("After cancellation");
  await waitForText("After cancellation");
  assert.equal(
    await page.evaluate(
      () =>
        window.requests.filter((request) => request.source !== undefined)
          .length,
    ),
    2,
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await waitForText("Make it yours");
  await page.screenshot({ path: "artifacts/examples/preview.png" });
  assert.equal(await page.evaluate(() => window.liveUrls.size), 1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: false }),
    ),
  );
  assert.equal(await page.evaluate(() => window.liveUrls.size), 0);
  assert.equal(await page.evaluate(() => window.terminations), 2);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  writeFileSync(
    "artifacts/examples/browser.json",
    JSON.stringify(
      {
        browser: browser.version(),
        checks: [
          "image preview",
          "coalesced updates",
          "literal text",
          "Worker termination",
          "source reload",
          "reset to defaults",
          "Worker and Blob URL disposal",
        ],
        errors,
        unexpected,
      },
      null,
      2,
    ),
  );
  console.log(
    "Worker example: preview, coalescing, cancellation, reload and reset passed.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
