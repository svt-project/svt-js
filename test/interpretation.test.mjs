import test from "node:test";
import assert from "node:assert/strict";
import {
  inspect,
  interpretPaint,
  interpretImage,
  defaultInterpretationLimits,
} from "../dist/index.js";
import { svg, success } from "./support.mjs";
import { interpretationCases, target } from "./interpretation-cases.mjs";
test("stamped interpretation cases and all named colors", interpretationCases);
test("work limits are inclusive and identify the bounded operation", () => {
  const paint = (raw, limits) => interpretPaint(target("fill", raw), limits);
  const image = (raw, limits) => interpretImage(target("image", raw), limits);
  assert.equal(paint("red", { maxPaintCharacters: 3 }).kind, "literal");
  assert.equal(
    paint(" red", { maxPaintCharacters: 3 }).exceededLimit,
    "maxPaintCharacters",
  );
  assert.equal(
    paint("rgb(01 2 3)", { maxNumericTokenCharacters: 2 }).kind,
    "literal",
  );
  assert.equal(
    paint("rgb(01 2 3)", { maxNumericTokenCharacters: 1 }).exceededLimit,
    "maxNumericTokenCharacters",
  );
  const deep = "f(".repeat(1000) + "var(--x)" + ")".repeat(1000);
  assert.equal(paint(deep, { maxNestingDepth: 1001 }).kind, "requires-context");
  assert.equal(
    paint(deep, { maxNestingDepth: 1000 }).exceededLimit,
    "maxNestingDepth",
  );
  assert.equal(
    image("x/y", { maxReferenceCharacters: 3 }).kind,
    "relative-reference",
  );
  assert.equal(
    image("x/y", { maxReferenceCharacters: 2 }).exceededLimit,
    "maxReferenceCharacters",
  );
  const uri = "data:," + "%".repeat(1000000);
  assert.equal(
    image(uri, { maxReferenceCharacters: 1, maxDataUriHeaderCharacters: 6 })
      .kind,
    "data-uri",
  );
  assert.equal(
    image(uri, { maxDataUriHeaderCharacters: 5 }).exceededLimit,
    "maxDataUriHeaderCharacters",
  );
  assert.equal(
    image("data:#,", { maxDataUriHeaderCharacters: 6 }).exceededLimit,
    null,
  );
  assert(Object.isFrozen(defaultInterpretationLimits));
  assert.throws(() => paint("red", { maxReferenceCharacters: 0 }), RangeError);
  assert.throws(() => image("x", { unknown: 1 }), TypeError);
  assert.throws(() => interpretPaint(target("image", null)), TypeError);
  assert.throws(() => interpretImage(target("text", null)), TypeError);
});
test("shared targets preserve raw evidence and binding intent", () => {
  const drawing = success(
    inspect(
      svg(
        '<path data-svt-fill="ink" fill="red"/><path data-svt-stroke="ink" stroke="#ff0000"/><image data-svt-image="pic" href="icons/a.svg"/>',
      ),
    ),
  );
  const ink = drawing.inputs.find((i) => i.key === "ink");
  assert.equal(ink.default.state, "mixed");
  const [a, b] = ink.targets.map((t) => interpretPaint(t));
  assert.deepEqual(a.color, b.color);
  assert(Object.isFrozen(a.color));
  assert.equal(a.target, ink.targets[0]);
  const pic = drawing.inputs.find((i) => i.key === "pic").targets[0];
  assert.equal(interpretImage(pic).target, pic);
  assert.equal(interpretImage(pic).kind, "relative-reference");
  assert.match(success(drawing.bind([])).svg, /fill="red"/);
  assert.match(success(drawing.bind([])).svg, /stroke="#ff0000"/);
  assert.match(
    success(
      drawing.bind([{ key: "ink", kind: "paint", value: "custom-paint" }]),
    ).svg,
    /fill="custom-paint"/,
  );
});
