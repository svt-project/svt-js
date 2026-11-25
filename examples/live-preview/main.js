import { createPreviewController } from "./controller.js";

const heading = document.querySelector("#heading");
const accent = document.querySelector("#accent");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
let previewUrl;
const response = await fetch("./template.svg");
if (!response.ok) throw new Error("Could not load the example template.");
const controller = createPreviewController({
  source: await response.text(),
  createWorker: () =>
    new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
  onResult(result) {
    if (!result.ok) {
      status.textContent = `${result.error.code}: ${result.error.message}`;
      return;
    }
    const next = URL.createObjectURL(
      new Blob([result.svg], { type: "image/svg+xml" }),
    );
    preview.src = next;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = next;
    status.textContent = "Preview updated";
  },
  onError(error) {
    status.textContent = `${error.kind}: ${error.message}`;
  },
});
function update() {
  status.textContent = "Updating…";
  controller.update([
    { key: "heading", kind: "text", value: heading.value },
    { key: "accent", kind: "paint", value: accent.value },
  ]);
}
heading.addEventListener("input", update);
accent.addEventListener("input", update);
document.querySelector("#cancel").addEventListener("click", () => {
  controller.cancel();
  status.textContent = "Canceled; edit a value to resume";
});
document.querySelector("#reset").addEventListener("click", () => {
  heading.value = "Make it yours";
  accent.value = "#007b67";
  // Omission restores the authored values because each bind starts from the template.
  controller.update([]);
});
window.addEventListener("pagehide", (event) => {
  if (event.persisted) controller.cancel();
  else {
    controller.dispose();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) update();
});

update();
