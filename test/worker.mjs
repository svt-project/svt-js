import { inspect, defaultInspectionLimits } from "../dist/index.js";
import { canonical, svg, success, equal, semantics } from "./support.mjs";
import fixtures from "../artifacts/fixtures.json";
import { replacementCharacter } from "./xml-preservation.mjs";
import { fragmentedText, textPositions } from "./text-binding.mjs";
import { interpretationCases } from "./interpretation-cases.mjs";
const result = canonical(fixtures);
const check = (name, run) => {
  try {
    run();
    result.results.push({ name, ok: true });
  } catch (e) {
    result.results.push({ name, ok: false, error: String(e) });
  }
};
check("Authored paint and image interpretation profile", interpretationCases);
check("Worker globals", () => {
  for (const name of ["DOMParser", "document", "Buffer", "process"])
    equal(typeof globalThis[name], "undefined");
});
check("Valid U+FFFD survives inspection and binding", replacementCharacter);
check("Fragmented text preserves comments and PIs", () => fragmentedText());
check("Text positions and multiple hooks survive copying", textPositions);
check("UTF-8 capture and fresh byte export", () => {
  const bytes = new TextEncoder().encode(
    svg('<text data-svt-text="a">é😀</text>'),
  );
  const t = success(inspect(bytes));
  bytes.fill(0);
  equal(t.inputs[0].default.raw, "é😀");
  const r = success(t.bind([{ key: "a", kind: "text", value: "\r😀" }]));
  equal(success(inspect(r.toUtf8())).inputs[0].default.raw, "\r😀");
  const b = r.toUtf8();
  b.fill(0);
  equal(new TextDecoder().decode(r.toUtf8()), r.svg);
});
check("Literal replacement and XML 1.0 line separators", () => {
  const source = svg(
    '<text data-svt-text="a">\u0085\u2028\u2029&#13;<!--keep--><?p keep?></text>',
  );
  const t = success(inspect(source));
  equal(semantics(success(t.bind([])).svg), semantics(source));
  const value = "</text><script>bad</script> &amp; &#13; \r";
  equal(
    success(inspect(success(t.bind([{ key: "a", kind: "text", value }])).svg))
      .inputs[0].default.raw,
    value,
  );
});
check("Image capture uses no Node APIs", () => {
  const t = success(inspect(svg('<image data-svt-image="a"/>')));
  const r = success(
    t.bind([
      {
        key: "a",
        kind: "image-content",
        bytes: new Uint8Array([0, 1, 255]),
        mediaType: "image/png",
      },
    ]),
  );
  equal(
    success(inspect(r.svg)).inputs[0].default.raw,
    "data:image/png;base64,AAH/",
  );
});
check("No external loading; DTD and output limit fail atomically", () => {
  equal(
    inspect(
      '<!DOCTYPE svg SYSTEM "http://127.0.0.1:9/must-not-fetch">' + svg(""),
    ).ok,
    false,
  );
  const t = success(inspect(svg('<text data-svt-text="a"/>')));
  equal(
    t.bind([{ key: "a", kind: "text", value: "&".repeat(100) }], {
      maxOutputBytes: 10,
    }).ok,
    false,
  );
  success(t.bind([]));
});
check("Multi-megabyte artwork and defaults in Worker", () => {
  const source = svg(
    '<text data-svt-text="a">old</text>' +
      ('<path d="M0 0 ' + "L1 1 ".repeat(80) + '"/>').repeat(5200),
  );
  if (source.length < 2 * 1024 * 1024) throw Error("fixture too small");
  equal(defaultInspectionLimits.maxSourceBytes, 20 * 1024 * 1024);
  const t = success(inspect(new TextEncoder().encode(source)));
  const r = success(t.bind([{ key: "a", kind: "text", value: "changed" }]));
  if (!r.svg.includes(">changed</text>")) throw Error("replacement missing");
});
result.ok = result.results.every((r) => r.ok);
self.postMessage({
  worker: self.constructor.name,
  userAgent: navigator.userAgent,
  ...result,
});
