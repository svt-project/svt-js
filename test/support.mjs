import { DOMParser } from "@xmldom/xmldom";
import { inspect } from "../dist/index.js";
export const SVG = "http://www.w3.org/2000/svg",
  SVT = "https://svt-project.github.io/ns/svt",
  RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
export const svg = (body = "", extra = "") =>
  `<svg xmlns="${SVG}" data-svt-version="1.0"${extra ? " " + extra : ""}>${body}</svg>`;
export function success(result) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
export function project(template) {
  return {
    format_version: 0,
    template_available: true,
    inputs: template.inputs.map((i) => ({
      key: i.key,
      label: i.label,
      kind: i.kind,
      targets: i.targets.map((t) => ({
        hook: t.hook,
        element_name: t.elementName,
        default: {
          ...t.default,
          source: t.default.source?.replaceAll("-", "_") ?? null,
        },
      })),
      default: i.default,
      description: i.description,
      label_source: i.labelSource,
      order: i.order,
    })),
    input_groups: template.groups.map((g) => ({
      key: g.key,
      label: g.label,
      description: g.description,
      order: g.order,
      input_keys: g.inputs.map((i) => i.key),
    })),
  };
}
export function inspection(source) {
  const r = inspect(source);
  return r.ok
    ? project(r.value)
    : {
        format_version: 0,
        template_available: false,
        inputs: [],
        input_groups: [],
      };
}
export function assignments(list) {
  return list.map((b) =>
    b.kind === "image_content"
      ? {
          key: b.key,
          kind: "image-content",
          bytes: Uint8Array.from(atob(b.value), (c) => c.charCodeAt(0)),
          mediaType: b.media_type,
        }
      : { key: b.key, kind: b.kind.replaceAll("_", "-"), value: b.value },
  );
}
export const stable = (x) =>
  JSON.stringify(x, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
export function equal(actual, expected) {
  if (stable(actual) !== stable(expected))
    throw new Error("Mismatch: " + stable({ actual, expected }));
}
export function semantics(source) {
  const doc = new DOMParser({
    normalizeLineEndings: (s) => s.replace(/\r\n?/g, "\n"),
    onError(_level, message) {
      throw new Error(message);
    },
  }).parseFromString(source, "application/xml");
  function walk(n) {
    const content = [];
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 7 && c.nodeName === "xml") continue;
      if (c.nodeType === 3 || c.nodeType === 4) {
        if (n.nodeType === 9 && /^\s*$/.test(c.nodeValue ?? "")) continue;
        const value = c.nodeValue ?? "";
        if (typeof content.at(-1) === "string")
          content[content.length - 1] += value;
        else if (value) content.push(value);
      } else content.push(walk(c));
    }
    if (n.nodeType === 1)
      return [
        "element",
        n.namespaceURI ?? "",
        n.localName,
        Array.from(n.attributes)
          .filter((a) => a.namespaceURI !== "http://www.w3.org/2000/xmlns/")
          .map((a) => [a.namespaceURI ?? "", a.localName, a.value])
          .sort((a, b) => {
            const x = a[0] + "\0" + a[1],
              y = b[0] + "\0" + b[1];
            return x < y ? -1 : x > y ? 1 : 0;
          }),
        content,
      ];
    if (n.nodeType === 9) return ["document", content];
    if (n.nodeType === 8) return ["comment", n.nodeValue];
    if (n.nodeType === 7) return ["pi", n.nodeName, n.nodeValue];
    throw new Error("Unexpected node " + n.nodeType);
  }
  return walk(doc);
}
export function canonical(fixtures) {
  const results = [],
    outputs = [];
  const check = (name, body) => {
    try {
      body();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: String(e) });
    }
  };
  for (const f of fixtures.inspection)
    check("inspection/" + f.name, () => {
      equal(inspection(f.source), f.expected);
      if (f.expected.template_available) {
        const template = success(inspect(f.source));
        const output = success(template.bind([])).svg;
        equal(semantics(output), semantics(f.source));
        outputs.push({
          name: "inspection/" + f.name,
          source: f.source,
          output,
          semantics: semantics(output),
        });
      }
    });
  for (const f of fixtures.substitution)
    check("substitution/" + f.name, () => {
      const t = success(inspect(f.source)),
        before = stable(project(t)),
        b = assignments(f.bindings),
        r = success(t.bind(b));
      equal(semantics(r.svg), semantics(f.expected));
      equal(success(t.bind(b)).svg, r.svg);
      equal(stable(project(t)), before);
      equal(semantics(success(t.bind([])).svg), semantics(f.source));
      equal(
        new TextDecoder("utf-8", { fatal: true }).decode(r.toUtf8()),
        r.svg,
      );
      if (r.svg.startsWith("<?xml") || r.svg.startsWith("\uFEFF"))
        throw new Error("Output declaration/BOM");
      outputs.push({
        name: f.name,
        source: f.expected,
        output: r.svg,
        semantics: semantics(r.svg),
      });
    });
  return { ok: results.every((r) => r.ok), results, outputs };
}
