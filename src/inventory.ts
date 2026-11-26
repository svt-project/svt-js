import type { Element, Node } from "@xmldom/xmldom";
import type {
  Hook,
  InspectionLimits,
  InputDefault,
  InputGroup,
  TemplateInput,
  TemplateTarget,
  TargetDefault,
} from "./model.js";
import { limit, reject } from "./policy.js";
import {
  attr,
  children,
  elements,
  is,
  isElement,
  RDF,
  SVG,
  SVT,
  XLINK,
  text,
  trim,
} from "./xml.js";
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
export interface InternalTarget {
  readonly elementIndex: number;
  readonly hook: Hook;
}
export interface InternalInput {
  input: Mutable<TemplateInput> & { targets: TemplateTarget[] };
  targets: InternalTarget[];
  group: string | null;
  index: number;
}
export interface Inventory {
  readonly inputs: readonly TemplateInput[];
  readonly groups: readonly InputGroup[];
  readonly bindings: ReadonlyMap<string, InternalInput>;
}
/** Preorder over artwork, excluding complete SVG metadata subtrees at every depth. */
export function* artwork(root: Element): IterableIterator<Element> {
  const stack: { next: Node | null }[] = [{ next: root }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (!frame) break;
    const e = frame.next;
    if (!e) {
      stack.pop();
      continue;
    }
    frame.next = e.nextSibling;
    if (!isElement(e) || is(e, SVG, "metadata")) continue;
    yield e;
    if (e.firstChild) stack.push({ next: e.firstChild });
  }
}
function evidence(e: Element, h: Hook): TargetDefault {
  if (h === "text")
    return { state: "present", raw: text(e), source: "text-content" };
  if (h === "fill" || h === "stroke") {
    const raw = attr(e, h);
    return raw === null
      ? { state: "absent", raw: null, source: h }
      : { state: "present", raw, source: h };
  }
  const href = attr(e, "href");
  if (href !== null) return { state: "present", raw: href, source: "href" };
  const xlink = e.getAttributeNS(XLINK, "href");
  if (e.hasAttributeNS(XLINK, "href") && xlink !== null)
    return { state: "present", raw: xlink, source: "xlink-href" };
  return { state: "absent", raw: null, source: null };
}
function summary(targets: readonly TemplateTarget[]): InputDefault {
  const first = targets[0]?.default;
  if (!first) throw new Error("Input without targets.");
  if (targets.every((t) => t.default.state === "absent"))
    return { state: "absent", raw: null };
  if (
    first.state === "present" &&
    targets.every(
      (t) => t.default.state === "present" && t.default.raw === first.raw,
    )
  )
    return { state: "common", raw: first.raw };
  return { state: "mixed", raw: null };
}
function invalid(message: string, inputKey?: string): never {
  return reject(
    "invalid-template",
    message,
    inputKey === undefined ? {} : { inputKey },
  );
}
function order(e: Element): number | null {
  const raw = attr(e, "order");
  if (raw === null) return null;
  if (raw.length === 0 || /[^0-9]/.test(raw) || Number(raw) > 2147483647)
    invalid("Metadata order must be an integer from 0 through 2147483647.");
  return Number(raw);
}
function whitespace(e: Element): void {
  for (const c of children(e))
    if (
      (c.nodeType === 3 || c.nodeType === 4) &&
      !/^[\x20\t\r\n]*$/.test(c.nodeValue ?? "")
    )
      invalid("Unexpected character data in recognized metadata.");
}
function description(e: Element): string | null {
  let found: Element | undefined;
  for (const c of elements(e))
    if (is(c, SVT, "description")) {
      if (found) invalid("Multiple descriptions are not supported.");
      found = c;
    }
  if (!found) return null;
  if (!elements(found).next().done)
    invalid("Descriptions cannot contain child elements.");
  return trim(text(found));
}
function rdfAttributes(e: Element, allowed: string): void {
  for (let i = 0; i < e.attributes.length; i++) {
    const a = e.attributes.item(i);
    if (a?.namespaceURI === RDF && a.localName !== allowed)
      invalid("Unsupported RDF envelope attribute.");
  }
}
function presentation(
  root: Element,
  bindings: Map<string, InternalInput>,
): readonly InputGroup[] {
  let container: Element | undefined;
  for (const metadata of elements(root))
    if (is(metadata, SVG, "metadata"))
      for (const rdf of elements(metadata))
        if (is(rdf, RDF, "RDF"))
          for (const desc of elements(rdf))
            if (
              is(desc, RDF, "Description") &&
              desc.hasAttributeNS(RDF, "about") &&
              desc.getAttributeNS(RDF, "about") === ""
            )
              for (const property of elements(desc))
                if (is(property, SVT, "inputs")) {
                  if (container) invalid("Multiple SVT metadata containers.");
                  if (property.getAttributeNS(RDF, "parseType") !== "Literal")
                    invalid('SVT metadata requires rdf:parseType="Literal".');
                  rdfAttributes(desc, "about");
                  rdfAttributes(property, "parseType");
                  container = property;
                }
  type GroupDraft = {
    key: string | null;
    label: string | null;
    description: string | null;
    order: number | null;
    members: InternalInput[];
  };
  const groups = new Map<string, GroupDraft>(),
    seenInputs = new Set<string>();
  if (container) {
    whitespace(container);
    for (const e of elements(container)) {
      const input = is(e, SVT, "input"),
        group = is(e, SVT, "group");
      if (!input && !group) continue;
      const key = attr(e, "key");
      if (!key) invalid("Metadata declarations require nonempty keys.");
      whitespace(e);
      const label = trim(attr(e, "label")),
        help = description(e),
        rank = order(e);
      if (group) {
        if (groups.has(key)) invalid("Duplicate metadata group key.");
        groups.set(key, {
          key,
          label: label ?? key,
          description: help,
          order: rank,
          members: [],
        });
      } else {
        const b = bindings.get(key);
        if (!b || seenInputs.has(key))
          invalid("Unknown or duplicate metadata input key.", key);
        seenInputs.add(key);
        if (label !== null) {
          b.input.label = label;
          b.input.labelSource = "metadata";
        }
        b.input.description = help;
        b.input.order = rank;
        b.group = attr(e, "group");
        if (b.group === "") invalid("Empty metadata group reference.", key);
      }
    }
  }
  const unnamed: GroupDraft = {
    key: null,
    label: null,
    description: null,
    order: null,
    members: [],
  };
  for (const b of bindings.values()) {
    const g = b.group === null ? unnamed : groups.get(b.group);
    if (!g) invalid("Unknown metadata group reference.", b.input.key);
    g.members.push(b);
  }
  const rank = (x: number | null) => x ?? Infinity;
  const ordered = [...groups.values()].filter((g) => g.members.length > 0);
  ordered.sort(
    (a, b) =>
      rank(a.order) - rank(b.order) ||
      (a.members[0]?.index ?? 0) - (b.members[0]?.index ?? 0),
  );
  if (unnamed.members.length) ordered.push(unnamed);
  return Object.freeze(
    ordered.map((g) => {
      g.members.sort(
        (a, b) =>
          rank(a.input.order) - rank(b.input.order) || a.index - b.index,
      );
      return Object.freeze({
        key: g.key,
        label: g.label,
        description: g.description,
        order: g.order,
        inputs: Object.freeze(g.members.map((b) => b.input)),
      });
    }),
  );
}
export function inventory(root: Element, limits: InspectionLimits): Inventory {
  if (!is(root, SVG, "svg") || attr(root, "data-svt-version") !== "1.0")
    reject(
      "unsupported-template",
      "Expected SVG root and exact template marker 1.0.",
    );
  const bindings = new Map<string, InternalInput>();
  let index = 0,
    count = 0;
  for (const e of artwork(root)) {
    const elementIndex = index++;
    for (const hook of ["text", "image", "fill", "stroke"] as const) {
      const key = attr(e, "data-svt-" + hook);
      if (key === null) continue;
      limit(++count, limits.maxTargets, "maxTargets");
      if (
        !key ||
        e.namespaceURI !== SVG ||
        (hook === "text" && !elements(e).next().done)
      )
        invalid("Empty key or incompatible binding target.", key);
      const kind = hook === "fill" || hook === "stroke" ? "paint" : hook;
      let b = bindings.get(key);
      if (b && b.input.kind !== kind)
        invalid("Conflicting input kinds for the same key.", key);
      if (!b) {
        const label = trim(attr(e, "data-svt-label"));
        b = {
          input: {
            key,
            label: label ?? key,
            kind,
            targets: [],
            default: { state: "absent", raw: null },
            description: null,
            labelSource: label === null ? "key" : "element",
            order: null,
          },
          targets: [],
          group: null,
          index: bindings.size,
        };
        bindings.set(key, b);
      }
      b.input.targets.push(
        Object.freeze({
          hook,
          elementName: e.localName ?? e.tagName,
          default: Object.freeze(evidence(e, hook)),
        }),
      );
      b.targets.push({ hook, elementIndex });
    }
  }
  for (const b of bindings.values())
    b.input.default = Object.freeze(summary(b.input.targets));
  const groups = presentation(root, bindings);
  for (const b of bindings.values()) {
    Object.freeze(b.input.targets);
    Object.freeze(b.input);
  }
  return {
    inputs: Object.freeze([...bindings.values()].map((b) => b.input)),
    groups,
    bindings,
  };
}
