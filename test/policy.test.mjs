import test from "node:test";
import assert from "node:assert/strict";
import {
  inspect,
  defaultInspectionLimits,
  defaultBindingLimits,
} from "../dist/index.js";
import { svg, success, semantics, SVT, RDF } from "./support.mjs";
import { replacementCharacter } from "./xml-preservation.mjs";
test(
  "valid U+FFFD survives inspection and binding without hiding XML errors",
  replacementCharacter,
);
const rejects = (r, code) => {
  assert.equal(r.ok, false);
  assert.equal(r.error.code, code);
  assert.equal("value" in r, false);
  return r.error;
};
const limited = (r, name) =>
  assert.equal(rejects(r, "limit-exceeded").limit, name);
const bind = (t, value, options) =>
  t.bind([{ key: "a", kind: "text", value }], options);
const input = svg('<text data-svt-text="a">old</text>');
const metadata = (body) =>
  svg(
    `<metadata><r:RDF><r:Description r:about=""><s:inputs r:parseType="Literal">${body}</s:inputs></r:Description></r:RDF></metadata><rect data-svt-fill="a"/>`,
    `xmlns:r="${RDF}" xmlns:s="${SVT}"`,
  );
test("UTF-8, BOM, sliced views, and source ownership", () => {
  const data = new TextEncoder().encode("\uFEFF" + input),
    t = success(inspect(data));
  data.fill(0);
  assert.equal(t.inputs[0].default.raw, "old");
  const wrapped = new Uint8Array(new TextEncoder().encode(input).length + 2);
  wrapped.set(new TextEncoder().encode(input), 1);
  success(inspect(wrapped.subarray(1, -1)));
  rejects(inspect(new Uint8Array([0xff])), "xml-parse");
  rejects(inspect(new Uint8Array([0xc0, 0xaf])), "xml-parse");
  rejects(inspect(new Uint8Array([0xff, 0xfe, 0x3c, 0])), "xml-parse");
  rejects(
    inspect(
      new TextEncoder().encode(
        '<?xml version="1.0" encoding="UTF-16"?>' + input,
      ),
    ),
    "xml-parse",
  );
  success(inspect('<?xml version="1.0" encoding="UTF-16"?>' + input));
  assert.throws(
    () => inspect(new Uint8Array(new SharedArrayBuffer(4))),
    TypeError,
  );
});
test("XML 1.0 normalization, CR serialization and literal replacements", () => {
  const source = svg(
    '<text data-svt-text="a" x="A\tB&#9;C">a\r\nb\rc\u0085\u2028\u2029&#13;<![CDATA[\u0085]]><!--keep--><?p keep?></text>',
  );
  const t = success(inspect(source));
  assert.equal(t.inputs[0].default.raw, "a\nb\nc\u0085\u2028\u2029\r\u0085");
  assert.deepEqual(semantics(success(t.bind([])).svg), semantics(source));
  const value = '\r\n</text><script>bad</script> &amp; &#13; ]]> " 😀';
  const r = success(bind(t, value));
  assert.equal(success(inspect(r.svg)).inputs[0].default.raw, value);
  assert.equal(r.svg.includes("<script>"), false);
  assert.ok(r.svg.includes("<!--keep-->"));
  for (const bad of ["\0", "\ud800", "\udc00", "\ufffe", "\uffff"])
    rejects(bind(t, bad), "invalid-binding");
  rejects(inspect('<?xml version="1.1"?>' + input), "xml-parse");
});
test("DTD and parser-reported failures reject; inert DTD-like data remains valid", () => {
  for (const d of [
    '<!DOCTYPE svg SYSTEM "http://127.0.0.1:9/unreachable">',
    '<!DOCTYPE svg [<!ENTITY a SYSTEM "file:///unreachable">]>',
    '<!DOCTYPE svg [<!ENTITY a "x">]>',
  ])
    rejects(inspect(d + input), "invalid-template");
  rejects(inspect(svg("<g></bad>")), "xml-parse");
  rejects(inspect(svg("<text>&undefined;</text>")), "xml-parse");
  success(
    inspect(
      svg(
        '<!-- <!DOCTYPE svg> --><text data-svt-text="a"><![CDATA[<!DOCTYPE svg>]]></text>',
      ),
    ),
  );
});
test("unsupported identities are distinct from parse failures", () => {
  for (const source of [
    '<svg data-svt-version="1.0"/>',
    input.replace("1.0", "0"),
    input.replace("1.0", " 1.0 "),
    input.replace("http://www.w3.org/2000/svg", "http://www.w3.org/2000/svg/"),
  ])
    rejects(inspect(source), "unsupported-template");
});
test("exact keys, unknown SVG elements, raw properties, and namespace lookalikes", () => {
  const t = success(
    inspect(
      svg(
        '<unknown data-svt-text="__proto__">001</unknown><rect data-svt-fill=" é " fill="not a color"/><rect data-svt-fill="é" f:data-svt-stroke="ignored"/>',
        'xmlns:f="urn:foreign"',
      ),
    ),
  );
  assert.deepEqual(
    t.inputs.map((i) => i.key),
    ["__proto__", " é ", "é"],
  );
  assert.equal(t.inputs[0].default.raw, "001");
  assert.equal(t.inputs[1].default.raw, "not a color");
  rejects(
    inspect(svg('<text data-svt-text="a"><tspan/></text>')),
    "invalid-template",
  );
  rejects(
    inspect(svg('<text data-svt-text="a"/><image data-svt-image="a"/>')),
    "invalid-template",
  );
  rejects(inspect(svg('<text data-svt-text=""/>')), "invalid-template");
});
for (const [name, body] of Object.entries({
  duplicateInput: '<s:input key="a"/><s:input key="a"/>',
  unknownInput: '<s:input key="b"/>',
  duplicateGroup: '<s:group key="g"/><s:group key="g"/>',
  emptyGroup: '<s:input key="a" group=""/>',
  unknownGroup: '<s:input key="a" group="missing"/>',
  badOrder: '<s:input key="a" order="2147483648"/>',
  negativeOrder: '<s:input key="a" order="-1"/>',
  descriptionMarkup:
    '<s:input key="a"><s:description><foreign/></s:description></s:input>',
  duplicateDescription:
    '<s:input key="a"><s:description/><s:description/></s:input>',
  unexpectedText: 'text<s:input key="a"/>',
  emptyKey: '<s:group key=""/>',
}))
  test("whole-template metadata rejection: " + name, () =>
    rejects(inspect(metadata(body)), "invalid-template"),
  );
test("metadata envelope, empty unused groups, foreign and misplaced subtrees", () => {
  rejects(
    inspect(metadata("").replace('r:about=""', 'r:about="" r:ID="bad"')),
    "invalid-template",
  );
  rejects(
    inspect(
      metadata("").replace(
        'r:parseType="Literal"',
        'r:parseType="Literal" r:resource="bad"',
      ),
    ),
    "invalid-template",
  );
  rejects(
    inspect(metadata("").replace('r:parseType="Literal"', "")),
    "invalid-template",
  );
  rejects(
    inspect(
      metadata("").replace(
        '<s:inputs r:parseType="Literal"></s:inputs>',
        '<s:inputs r:parseType="Literal"/><s:inputs r:parseType="Literal"/>',
      ),
    ),
    "invalid-template",
  );
  rejects(
    inspect(metadata('<s:group key="empty" order="bad"/>')),
    "invalid-template",
  );
  success(
    inspect(
      metadata(
        '<s:input key="a" strange="v"><s:group key=""/><foreign><s:description><child/></s:description></foreign></s:input>',
      ),
    ),
  );
  const opaque = metadata('<s:input key="missing"/>').replace(
    'r:about=""',
    'r:about="#other"',
  );
  success(inspect(opaque));
});
test("group order uses first structural member, preserving shared identities", () => {
  const source = metadata(
    '<s:group key="y"/><s:group key="x"/><s:input key="a" group="x"/><s:input key="b" group="y"/><s:input key="c" group="y" order="0"/>',
  ).replace(
    '<rect data-svt-fill="a"/>',
    '<rect data-svt-fill="a"/><rect data-svt-fill="b"/><rect data-svt-fill="c"/><rect data-svt-fill="d"/>',
  );
  const t = success(inspect(source));
  assert.deepEqual(
    t.groups.map((g) => g.key),
    ["x", "y", null],
  );
  assert.deepEqual(
    t.groups[1].inputs.map((i) => i.key),
    ["c", "b"],
  );
  assert.equal(t.groups[1].inputs[0], t.inputs[2]);
  for (const object of [
    t,
    t.inputs,
    t.inputs[0],
    t.inputs[0].targets,
    t.inputs[0].targets[0],
    t.inputs[0].targets[0].default,
    t.inputs[0].default,
    t.groups,
    t.groups[0],
    t.groups[0].inputs,
  ])
    assert.ok(Object.isFrozen(object));
});
test("binding failures are atomic, omissions and empty values distinct", () => {
  const t = success(inspect(input));
  rejects(t.bind([{ key: "?", kind: "text", value: "x" }]), "invalid-binding");
  rejects(t.bind([{ key: "a", kind: "paint", value: "x" }]), "invalid-binding");
  rejects(
    t.bind([
      { key: "a", kind: "text", value: "1" },
      { key: "a", kind: "text", value: "2" },
    ]),
    "invalid-binding",
  );
  assert.equal(
    success(inspect(success(bind(t, "")).svg)).inputs[0].default.raw,
    "",
  );
  assert.equal(
    success(inspect(success(t.bind([])).svg)).inputs[0].default.raw,
    "old",
  );
  const a = success(bind(t, "first")),
    b = success(bind(t, "second"));
  assert.equal(success(inspect(a.svg)).inputs[0].default.raw, "first");
  assert.equal(success(inspect(b.svg)).inputs[0].default.raw, "second");
  const data = a.toUtf8();
  data.fill(0);
  assert.equal(new TextDecoder().decode(a.toUtf8()), a.svg);
});
test("image encoding, empty content, media grammar, ownership and XLink duplication", () => {
  const t = success(
      inspect(
        svg(
          '<image data-svt-image="a" z:href="old"/>',
          'xmlns:z="http://www.w3.org/1999/xlink"',
        ),
      ),
    ),
    data = new Uint8Array([0, 1, 2, 255]);
  const r = success(
    t.bind([
      {
        key: "a",
        kind: "image-content",
        bytes: data,
        mediaType: "IMAGE/SVG+XML",
      },
    ]),
  );
  data.fill(0);
  assert.ok(r.svg.includes("data:image/svg+xml;base64,AAEC/w=="));
  assert.equal((r.svg.match(/AAEC\/w==/g) ?? []).length, 2);
  const empty = success(
    t.bind([
      {
        key: "a",
        kind: "image-content",
        bytes: new Uint8Array(),
        mediaType: "image/x&a",
      },
    ]),
  );
  assert.ok(empty.svg.includes("image/x&amp;a;base64,"));
  for (const mediaType of [
    "text/plain",
    "image/*",
    "image/png;foo=x",
    "image/a#b",
    "image/a%20b",
  ])
    rejects(
      t.bind([
        { key: "a", kind: "image-content", bytes: new Uint8Array(), mediaType },
      ]),
      "invalid-binding",
    );
  assert.throws(
    () =>
      t.bind([
        {
          key: "a",
          kind: "image-content",
          bytes: new Uint8Array(new SharedArrayBuffer(4)),
          mediaType: "image/png",
        },
      ]),
    TypeError,
  );
});
test("source and structure limits: equality and one below", () => {
  const s = svg("<rect/>"),
    b = new TextEncoder().encode(s);
  for (const [name, value] of Object.entries({
    maxSourceBytes: b.length,
    maxSourceCharacters: s.length,
    maxNodes: 3,
    maxDepth: 2,
    maxAttributesPerElement: 2,
  })) {
    success(inspect(name === "maxSourceBytes" ? b : s, { [name]: value }));
    limited(
      inspect(name === "maxSourceBytes" ? b : s, { [name]: value - 1 }),
      name,
    );
  }
  const multi = svg('<rect data-svt-fill="a" data-svt-stroke="a"/>');
  success(inspect(multi, { maxTargets: 2 }));
  limited(inspect(multi, { maxTargets: 1 }), "maxTargets");
});
test("binding counters: equality and one beyond", () => {
  const t = success(
      inspect(svg('<text data-svt-text="a"/><text data-svt-text="b"/>')),
    ),
    list = [
      { key: "a", kind: "text", value: "1234" },
      { key: "b", kind: "text", value: "1234" },
    ];
  for (const [name, value] of Object.entries({
    maxBindings: 2,
    maxValueCharacters: 4,
    maxTotalValueCharacters: 10,
  })) {
    success(t.bind(list, { [name]: value }));
    limited(t.bind(list, { [name]: value - 1 }), name);
  }
  const im = success(
      inspect(svg('<image data-svt-image="a"/><image data-svt-image="b"/>')),
    ),
    images = ["a", "b"].map((key) => ({
      key,
      kind: "image-content",
      bytes: new Uint8Array(3),
      mediaType: "image/png",
    }));
  for (const [name, value] of Object.entries({
    maxImageBytes: 3,
    maxTotalImageBytes: 6,
    maxMediaTypeCharacters: 9,
  })) {
    success(im.bind(images, { [name]: value }));
    limited(im.bind(images, { [name]: value - 1 }), name);
  }
});
test("output equality/excess and repeated escaped/image growth preflight", () => {
  const t = success(inspect(input)),
    a = [{ key: "a", kind: "text", value: '😀\r&<>"' }],
    out = success(t.bind(a)),
    size = out.toUtf8().length;
  success(t.bind(a, { maxOutputBytes: size }));
  limited(t.bind(a, { maxOutputBytes: size - 1 }), "maxOutputBytes");
  const paints = success(
    inspect(svg('<rect data-svt-fill="a" data-svt-stroke="a"/>')),
  );
  limited(
    paints.bind([{ key: "a", kind: "paint", value: "&".repeat(20) }], {
      maxOutputBytes: 199,
    }),
    "maxOutputBytes",
  );
  const image = success(
    inspect(
      svg(
        '<image data-svt-image="a" x:href="old"/>',
        'xmlns:x="http://www.w3.org/1999/xlink"',
      ),
    ),
  );
  limited(
    image.bind(
      [
        {
          key: "a",
          kind: "image-content",
          bytes: new Uint8Array(100),
          mediaType: "image/png",
        },
      ],
      { maxOutputBytes: 200 },
    ),
    "maxOutputBytes",
  );
});
test("programming misuse throws, options are copied, defaults frozen", () => {
  for (const source of [null, undefined, {}, 123])
    assert.throws(() => inspect(source), TypeError);
  for (const options of [null, [], { unknown: 1 }])
    assert.throws(() => inspect(input, options), TypeError);
  for (const value of [
    0,
    -1,
    NaN,
    Infinity,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    undefined,
  ])
    assert.throws(() => inspect(input, { maxNodes: value }), RangeError);
  const opt = { maxNodes: 100 },
    t = success(inspect(input, opt));
  opt.maxNodes = 1;
  success(t.bind([]));
  assert.ok(Object.isFrozen(defaultInspectionLimits));
  assert.ok(Object.isFrozen(defaultBindingLimits));
  for (const bindings of [
    null,
    {},
    [null],
    [{ key: "a", kind: "invalid", value: "x" }],
    [{ key: "a", kind: "text", value: null }],
  ])
    assert.throws(() => t.bind(bindings), TypeError);
});
test("multi-megabyte independent artwork fits defaults with repeatable binding", () => {
  const path = '<path d="M0 0 ' + "L1 1 ".repeat(80) + '" fill="#abc"/>';
  const source = svg(
    '<text data-svt-text="a">Title</text>' + path.repeat(5000),
  );
  assert.ok(source.length > 2 * 1024 * 1024);
  const t = success(inspect(new TextEncoder().encode(source)));
  const out = success(bind(t, "A new title"));
  assert.ok(out.svg.includes("A new title"));
  assert.equal(success(t.bind([])).svg.includes(">Title</text>"), true);
});

test("metadata numeric fields and media types reject terminal line breaks", () => {
  for (const ending of ["&#10;", "&#13;", "&#x2028;", "&#x2029;"]) {
    rejects(
      inspect(metadata('<s:input key="a" order="1' + ending + '"/>')),
      "invalid-template",
    );
  }
  const image = success(inspect(svg('<image data-svt-image="a"/>')));
  for (const ending of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    rejects(
      image.bind([
        {
          key: "a",
          kind: "image-content",
          bytes: new Uint8Array(),
          mediaType: "image/png" + ending,
        },
      ]),
      "invalid-binding",
    );
  }
});

test("base64 chunk boundaries preserve complete bytes and padding", () => {
  const image = success(inspect(svg('<image data-svt-image="a"/>')));
  for (const size of [1, 2, 3, 12287, 12288, 12289, 24577]) {
    const bytes = Uint8Array.from({ length: size }, (_, i) => i % 256);
    const output = success(
      image.bind([
        { key: "a", kind: "image-content", bytes, mediaType: "image/png" },
      ]),
    );
    const raw = success(inspect(output.svg)).inputs[0].default.raw;
    assert.deepEqual(
      Uint8Array.from(atob(raw.split(",")[1]), (c) => c.charCodeAt(0)),
      bytes,
    );
  }
});

test("labels and descriptions preserve long interior XML whitespace", () => {
  const label = "left" + " ".repeat(150000) + "right";
  const source = metadata(
    '<s:input key="a" label="  ' +
      label +
      '  "><s:description> ' +
      label +
      " </s:description></s:input>",
  );
  const t = success(inspect(source));
  assert.equal(t.inputs[0].label, label);
  assert.equal(t.inputs[0].description, label);
  const nbsp = success(inspect(metadata('<s:input key="a" label="&#160;"/>')));
  assert.equal(nbsp.inputs[0].label, "\u00a0");
});

test("serializer-reported XML failures return no partial document", () => {
  const result = inspect(svg("<text>\0</text>"));
  if (result.ok) rejects(result.value.bind([]), "invalid-template");
  else assert.equal(result.error.code, "xml-parse");
});
