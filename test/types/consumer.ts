import {
  inspect,
  interpretPaint,
  interpretImage,
  type Binding,
  type Result,
  type Template,
  defaultInspectionLimits,
} from "../../dist/index.js";
const inspected: Result<Template> = inspect(new Uint8Array(), {
  maxSourceBytes: defaultInspectionLimits.maxSourceBytes,
});
const assignments: readonly Binding[] = [
  { key: "text", kind: "text", value: "literal" },
  {
    key: "picture",
    kind: "image-content",
    bytes: new Uint8Array(),
    mediaType: "image/png",
  },
];
if (inspected.ok) {
  const result = inspected.value.bind(assignments);
  if (result.ok) {
    const text: string = result.value.svg;
    const bytes: Uint8Array = result.value.toUtf8();
    void text;
    void bytes;
  }
  for (const input of inspected.value.inputs) {
    for (const target of input.targets) {
      if (target.hook === "image") {
        const result = interpretImage(target);
        if (result.kind === "data-uri") {
          const media: string | null = result.declaredMediaType;
          void media;
        }
      } else if (target.hook === "fill" || target.hook === "stroke") {
        const result = interpretPaint(target);
        if (result.kind === "literal") {
          const alpha: number = result.color.alpha;
          void alpha;
        }
      }
    }
    if (input.default.state === "common") {
      const value: string = input.default.raw;
      void value;
    }
  }
  // @ts-expect-error inventory is immutable
  inspected.value.inputs.push({});
  // @ts-expect-error templates do not expose a mutable DOM
  inspected.value.document;
} else {
  const message: string = inspected.error.message;
  void message;
}
// @ts-expect-error text assignments require string payloads
const wrong: Binding = { key: "a", kind: "text", value: 42 };
void wrong;
