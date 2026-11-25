import { inspect } from "../dist/index.js";
import { equal, svg, success } from "./support.mjs";

// Shared by Node and a real dedicated Worker. U+FFFD is legal XML character data,
// even though the selected processor warns about possible upstream decoding loss.
export function replacementCharacter() {
  const source = svg(
    '<text data-svt-text="t" data-svt-label="\uFFFD">\uFFFD<![CDATA[\uFFFD]]></text>' +
      '<image data-svt-image="i" href="\uFFFD"/>' +
      '<g data-svt-fill="p" fill="\uFFFD"/>',
  );
  for (const input of [source, new TextEncoder().encode(source)]) {
    const t = success(inspect(input));
    equal(
      t.inputs.map((i) => i.default.raw),
      ["\uFFFD\uFFFD", "\uFFFD", "\uFFFD"],
    );
    equal(t.inputs[0].label, "\uFFFD");
    const omitted = success(t.bind([]));
    equal(success(inspect(omitted.toUtf8())).inputs, t.inputs);
    const result = success(
      t.bind([
        { key: "t", kind: "text", value: "\uFFFD" },
        { key: "i", kind: "image-reference", value: "\uFFFD" },
        { key: "p", kind: "paint", value: "\uFFFD" },
      ]),
    );
    equal(
      success(inspect(result.toUtf8())).inputs.map((i) => i.default.raw),
      ["\uFFFD", "\uFFFD", "\uFFFD"],
    );
  }
  const referenced = success(
    inspect(svg('<text data-svt-text="a">&#xFFFD;</text>')),
  );
  equal(
    success(inspect(success(referenced.bind([])).svg)).inputs[0].default.raw,
    "\uFFFD",
  );
  // The same source must not hide an actual parser error following the warning.
  equal(inspect(svg("<text>\uFFFD&undefined;</text>")).ok, false);
  equal(inspect(svg("<g>\uFFFD</bad>")).ok, false);
  equal(inspect(new Uint8Array([0xff])).ok, false);
}
