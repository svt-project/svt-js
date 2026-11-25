import type { Document, Element } from "@xmldom/xmldom";
import type { Binding, BindingOptions, BoundSvg, Result } from "./model.js";
import type { Inventory, InternalInput } from "./inventory.js";
import { artwork } from "./inventory.js";
import {
  addWithin,
  attempt,
  bytes,
  defaultBindingLimits,
  limit,
  options,
  reject,
  string,
  utf8Length,
  xmlValue,
} from "./policy.js";
import { children, serialize, XLINK } from "./xml.js";
interface Prepared {
  input: InternalInput;
  value: string | Uint8Array;
  mediaType: string | null;
}
/** UTF-8 length of emitted character data or attribute content under the selected serializer. */
function escapedLength(value: string, attribute: boolean): number {
  let n = 0;
  for (const c of value) {
    if (c === "&") n += 5;
    else if (c === "<" || c === ">") n += 4;
    else if (attribute && c === '"') n += 6;
    else if (c === "\r") n += 5;
    else if (attribute && (c === "\n" || c === "\t")) n += c === "\t" ? 4 : 5;
    else n += utf8Length(c);
  }
  return n;
}
function base64(bytes: Uint8Array): string {
  // Chunk at a multiple of three; bound argument/string sizes independently of the image size.
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 12288) {
    let raw = "";
    for (const b of bytes.subarray(offset, offset + 12288))
      raw += String.fromCharCode(b);
    parts.push(btoa(raw));
  }
  return parts.join("");
}
export function bind(
  captured: Document,
  inventory: Inventory,
  assignments: readonly Binding[],
  configuration?: BindingOptions,
): Result<BoundSvg> {
  const limits = options(defaultBindingLimits, configuration);
  if (!Array.isArray(assignments))
    throw new TypeError("Bindings must be an array.");
  return attempt(() => {
    limit(assignments.length, limits.maxBindings, "maxBindings");
    let totalValues = 0,
      totalImages = 0,
      expansion = 0;
    const seen = new Set<string>(),
      prepared: Prepared[] = [];
    for (const supplied of assignments) {
      if (supplied === null || typeof supplied !== "object")
        throw new TypeError("A binding must be an object.");
      const key = string(supplied.key, "Binding key"),
        kind = string(supplied.kind, "Binding kind");
      if (!["text", "paint", "image-reference", "image-content"].includes(kind))
        throw new TypeError("Unknown binding kind.");
      limit(key.length, limits.maxValueCharacters, "maxValueCharacters");
      totalValues = addWithin(
        totalValues,
        key.length,
        limits.maxTotalValueCharacters,
        "maxTotalValueCharacters",
      );
      if (seen.has(key))
        reject("invalid-binding", "Duplicate binding key.", { inputKey: key });
      seen.add(key);
      const input = inventory.bindings.get(key);
      if (!input)
        reject("invalid-binding", "Unknown binding key.", { inputKey: key });
      if (input.input.kind !== (kind.startsWith("image-") ? "image" : kind))
        reject("invalid-binding", "Binding kind does not match input.", {
          inputKey: key,
        });
      let value: string | Uint8Array,
        mediaType: string | null = null,
        emitted: number;
      if (supplied.kind === "image-content") {
        const view = bytes(supplied.bytes, "Image bytes");
        limit(view.byteLength, limits.maxImageBytes, "maxImageBytes");
        totalImages = addWithin(
          totalImages,
          view.byteLength,
          limits.maxTotalImageBytes,
          "maxTotalImageBytes",
        );
        const media = string(supplied.mediaType, "Media type");
        limit(
          media.length,
          limits.maxMediaTypeCharacters,
          "maxMediaTypeCharacters",
        );
        if (
          media.slice(0, 6).toLowerCase() !== "image/" ||
          media.length === 6 ||
          /[^A-Za-z0-9!$&^_.+\-]/.test(media.slice(6))
        )
          reject("invalid-binding", "Invalid image media type.", {
            inputKey: key,
          });
        mediaType = media.toLowerCase();
        emitted =
          escapedLength("data:" + mediaType + ";base64,", true) +
          4 * Math.ceil(view.byteLength / 3);
        value = view; // Copy only after the expansion preflight below, before any DOM mutation.
      } else {
        value = string(supplied.value, "Binding value");
        limit(value.length, limits.maxValueCharacters, "maxValueCharacters");
        totalValues = addWithin(
          totalValues,
          value.length,
          limits.maxTotalValueCharacters,
          "maxTotalValueCharacters",
        );
        xmlValue(value, key);
        emitted = escapedLength(value, kind !== "text");
      }
      for (let i = 0; i < input.targets.length; i++) {
        expansion = addWithin(
          expansion,
          emitted,
          limits.maxOutputBytes,
          "maxOutputBytes",
        );
        // Existing XLink href duplicates the new unnamespaced href; captured inventory records origin
        // but both attributes may exist. Count duplicates from the captured elements below.
      }
      prepared.push({ input, value, mediaType });
    }
    // Map only requested targets before cloning; account for duplicate href output using source DOM.
    const operations = new Map<
      number,
      { hook: "text" | "image" | "fill" | "stroke"; prepared: Prepared }[]
    >();
    for (const p of prepared)
      for (const t of p.input.targets) {
        const list = operations.get(t.elementIndex) ?? [];
        list.push({ hook: t.hook, prepared: p });
        operations.set(t.elementIndex, list);
      }
    const sourceRoot = captured.documentElement;
    if (!sourceRoot) throw new Error("Captured document has no root.");
    let index = 0;
    for (const element of artwork(sourceRoot)) {
      for (const operation of operations.get(index++) ?? [])
        if (
          operation.hook === "image" &&
          element.hasAttributeNS(XLINK, "href")
        ) {
          const p = operation.prepared;
          const size =
            typeof p.value === "string"
              ? escapedLength(p.value, true)
              : escapedLength("data:" + p.mediaType + ";base64,", true) +
                4 * Math.ceil(p.value.byteLength / 3);
          expansion = addWithin(
            expansion,
            size,
            limits.maxOutputBytes,
            "maxOutputBytes",
          );
        }
    }
    for (const p of prepared)
      if (typeof p.value !== "string")
        p.value = "data:" + p.mediaType + ";base64," + base64(p.value.slice());
    // cloneNode(true) preserves Document kind; only private captured Document values reach here.
    const doc = captured.cloneNode(true) as Document;
    const root = doc.documentElement;
    if (!root) throw new Error("Cloned document has no root.");
    index = 0;
    for (const element of artwork(root))
      for (const operation of operations.get(index++) ?? []) {
        const value = operation.prepared.value;
        if (typeof value !== "string") throw new Error("Unprepared binding.");
        replace(doc, element, operation.hook, value);
      }
    const svg = serialize(doc);
    limit(utf8Length(svg), limits.maxOutputBytes, "maxOutputBytes");
    return Object.freeze({ svg, toUtf8: () => new TextEncoder().encode(svg) });
  });
}
function replace(
  doc: Document,
  element: Element,
  hook: string,
  value: string,
): void {
  if (hook === "text") {
    const characters = [...children(element)].filter(
      (c) => c.nodeType === 3 || c.nodeType === 4,
    );
    if (value)
      element.insertBefore(doc.createTextNode(value), characters[0] ?? null);
    for (const c of characters) element.removeChild(c);
  } else if (hook === "image") {
    element.setAttribute("href", value);
    const xlink = element.getAttributeNodeNS(XLINK, "href");
    if (xlink) element.setAttributeNS(XLINK, xlink.name, value);
  } else element.setAttribute(hook, value);
}
