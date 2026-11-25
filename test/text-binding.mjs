import { inspect } from "../dist/index.js";
import { svg, success, equal, semantics } from "./support.mjs";

export function fragmentedText(count = 12) {
  const fragments = "<![CDATA[x]]><!--keep--><?p keep?>".repeat(count);
  const source = svg(
    `<text data-svt-text="a" data-svt-fill="b">${fragments}</text>`,
  );
  const template = success(inspect(source));
  const result = success(
    template.bind([
      { key: "a", kind: "text", value: "new <&>\r" },
      { key: "b", kind: "paint", value: "red" },
    ]),
  );
  const inspected = success(inspect(result.svg));
  equal(inspected.inputs[0].default.raw, "new <&>\r");
  equal(inspected.inputs[1].default.raw, "red");
  equal((result.svg.match(/<!--keep-->/g) ?? []).length, count);
  equal((result.svg.match(/<\?p keep\?>/g) ?? []).length, count);
  equal(template.inputs[0].default.raw, "x".repeat(count));
  return result.svg;
}

export function textPositions() {
  for (const [before, after, empty] of [
    [
      "<!--first--><?p before?>a<?p between?><![CDATA[b]]><!--last-->",
      "<!--first--><?p before?>new<?p between?><!--last-->",
      "<!--first--><?p before?><?p between?><!--last-->",
    ],
    [
      "<!--only--><?p only?>",
      "<!--only--><?p only?>new",
      "<!--only--><?p only?>",
    ],
    ["", "new", ""],
  ]) {
    const source = svg(`<text data-svt-text="a">${before}</text>`);
    const template = success(inspect(source));
    equal(semantics(success(template.bind([])).svg), semantics(source));
    equal(
      semantics(
        success(template.bind([{ key: "a", kind: "text", value: "new" }])).svg,
      ),
      semantics(svg(`<text data-svt-text="a">${after}</text>`)),
    );
    equal(
      semantics(
        success(template.bind([{ key: "a", kind: "text", value: "" }])).svg,
      ),
      semantics(svg(`<text data-svt-text="a">${empty}</text>`)),
    );
  }
  const root = success(
    inspect(svg("old<!--keep-->", 'data-svt-text="a" data-svt-fill="b"')),
  );
  const result = success(
    root.bind([
      { key: "a", kind: "text", value: "new" },
      { key: "b", kind: "paint", value: "red" },
    ]),
  );
  equal(
    success(inspect(result.svg)).inputs.map((i) => i.default.raw),
    ["new", "red"],
  );
}
