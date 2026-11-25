import {
  DOMParser,
  DOMException,
  ParseError,
  XMLSerializer,
  onWarningStopParsing,
} from "@xmldom/xmldom";
import type { Node, Element, Document } from "@xmldom/xmldom";
import type { InspectionLimits } from "./model.js";
import { bytes, limit, reject } from "./policy.js";
export const SVG = "http://www.w3.org/2000/svg",
  XLINK = "http://www.w3.org/1999/xlink",
  SVT = "https://svt-project.github.io/ns/svt",
  RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
export function* children(node: Node): IterableIterator<Node> {
  for (let c = node.firstChild; c; c = c.nextSibling) yield c;
}
export function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}
export function* elements(node: Node): IterableIterator<Element> {
  for (const c of children(node)) if (isElement(c)) yield c;
}
export const is = (e: Element, ns: string, local: string): boolean =>
  e.namespaceURI === ns && e.localName === local;
export const attr = (e: Element, name: string): string | null =>
  e.hasAttributeNS(null, name) ? e.getAttributeNS(null, name) : null;
export function trim(value: string | null): string | null {
  if (value === null) return null;
  const space = (code: number) =>
    code === 32 || code === 9 || code === 13 || code === 10;
  let start = 0,
    end = value.length;
  while (start < end && space(value.charCodeAt(start))) start++;
  while (end > start && space(value.charCodeAt(end - 1))) end--;
  return start === end ? null : value.slice(start, end);
}
export function text(node: Node): string {
  const parts: string[] = [];
  for (const c of children(node))
    if (c.nodeType === 3 || c.nodeType === 4) parts.push(c.nodeValue ?? "");
  return parts.join("");
}
export function parse(
  source: string | Uint8Array,
  limits: InspectionLimits,
): Document {
  let decoded: string;
  if (typeof source === "string") decoded = source;
  else {
    const view = bytes(source, "Source");
    limit(view.byteLength, limits.maxSourceBytes, "maxSourceBytes");
    const captured = view.slice();
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(captured);
    } catch (e) {
      if (e instanceof TypeError)
        reject("xml-parse", "Source is not valid UTF-8.");
      throw e;
    }
  }
  limit(decoded.length, limits.maxSourceCharacters, "maxSourceCharacters");
  let doc: Document;
  try {
    doc = new DOMParser({
      locator: false,
      onError: onWarningStopParsing,
      normalizeLineEndings: (s) => s.replace(/\r\n?/g, "\n"),
    }).parseFromString(decoded, "application/xml");
  } catch (e) {
    if (e instanceof ParseError) reject("xml-parse", e.message);
    throw e;
  }
  if (doc.doctype)
    reject("invalid-template", "DTD declarations are not supported.");
  // The parser owns XML declaration recognition. Inspect its parsed declaration, not raw XML syntax.
  for (const c of children(doc))
    if (c.nodeType === 7 && c.nodeName === "xml") {
      const data = c.nodeValue ?? "";
      const version = /\bversion\s*=\s*(['"])(.*?)\1/.exec(data)?.[2];
      if (version !== undefined && version !== "1.0")
        reject("xml-parse", "Only XML 1.0 is supported.");
      const encoding = /\bencoding\s*=\s*(['"])(.*?)\1/.exec(data)?.[2];
      if (
        typeof source !== "string" &&
        encoding !== undefined &&
        encoding.toUpperCase() !== "UTF-8"
      )
        reject("xml-parse", "Encoded input must declare UTF-8.");
    }
  // Iterative walk uses O(depth) traversal state, without a second flat collection of DOM nodes.
  let count = 0;
  const pending: { next: Node | null; depth: number }[] = [
    { next: doc, depth: 0 },
  ];
  while (pending.length) {
    const frame = pending[pending.length - 1];
    if (!frame) break;
    const node = frame.next;
    if (!node) {
      pending.pop();
      continue;
    }
    frame.next = node.nextSibling;
    limit(++count, limits.maxNodes, "maxNodes");
    const depth = frame.depth + (isElement(node) ? 1 : 0);
    if (isElement(node)) {
      limit(depth, limits.maxDepth, "maxDepth");
      limit(
        node.attributes.length,
        limits.maxAttributesPerElement,
        "maxAttributesPerElement",
      );
    }
    if (node.firstChild) pending.push({ next: node.firstChild, depth });
  }
  return doc;
}
export function serialize(doc: Document): string {
  // Owned DOM only: XML 1.0 preprocessing removes literal CR from original CDATA/comments/PIs.
  // Only text/attribute values can be replaced. Attributes already escape CR; the remaining CRs
  // are text data and must be references to survive reparsing. No caller-supplied DOM is accepted.
  try {
    return new XMLSerializer()
      .serializeToString(doc, {
        requireWellFormed: true,
        nodeFilter: (n) =>
          n.nodeType === 7 && n.nodeName === "xml" ? null : n,
      })
      .replace(/\r/g, "&#xD;");
  } catch (error) {
    if (error instanceof DOMException && error.name === "InvalidStateError")
      reject(
        "invalid-template",
        "Source cannot be serialized as well-formed XML.",
      );
    throw error;
  }
}
