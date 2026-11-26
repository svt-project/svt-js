import { interpretPaint, interpretImage } from "../dist/index.js";
import cases from "../conformance/interpretation/cases.json" with { type: "json" };
import names from "../conformance/interpretation/named-colors.json" with { type: "json" };
import { equal } from "./support.mjs";

export function target(hook, raw) {
  const source = hook === "image" ? (raw === null ? null : "href") : hook;
  return Object.freeze({
    hook,
    elementName: hook === "image" ? "image" : "path",
    default: Object.freeze({
      source,
      raw,
      state: raw === null ? "absent" : "present",
    }),
  });
}

function checkColor(color, expected) {
  [color.red, color.green, color.blue, color.alpha].forEach((value, index) => {
    if (
      !Number.isFinite(value) ||
      Object.is(value, -0) ||
      Math.abs(value - expected[index]) > 1e-12
    )
      throw Error(
        "Unexpected sRGB component: " + value + " versus " + expected[index],
      );
  });
}
export function interpretationCases() {
  for (const example of cases.cases) {
    const t = target(example.hook, example.raw);
    const result = t.hook === "image" ? interpretImage(t) : interpretPaint(t);
    const kind = example.kind.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (result.kind !== kind)
      throw Error(
        JSON.stringify({
          raw: example.raw,
          expected: kind,
          actual: result.kind,
        }),
      );
    equal(result.target === t, true);
    equal(Object.isFrozen(result), true);
    if (example.color) checkColor(result.color, example.color);
    if (result.kind === "data-uri")
      equal(result.declaredMediaType, example.declared_media_type);
    if (result.kind === "unsupported-or-unrecognized")
      equal(result.exceededLimit, null);
  }
  for (const [name, hex] of Object.entries(names.colors)) {
    const result = interpretPaint(target("stroke", name.toUpperCase()));
    equal(result.kind, "literal");
    checkColor(
      result.color,
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1),
    );
  }
}
