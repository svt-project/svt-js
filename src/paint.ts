import { literalColor, numberPattern } from "./color.js";
import { referenceCharacters } from "./image.js";
import type { InterpretationLimits, PaintValue } from "./interpretation.js";

const contextKeywords = new Set(
  (
    "currentcolor inherit initial unset revert revert-layer context-fill context-stroke " +
    "accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas canvastext " +
    "field fieldtext graytext highlight highlighttext linktext mark marktext selecteditem selecteditemtext visitedtext " +
    "activeborder activecaption appworkspace background buttonhighlight buttonshadow captiontext " +
    "inactiveborder inactivecaption inactivecaptiontext infobackground infotext menu menutext " +
    "scrollbar threeddarkshadow threedface threedhighlight threedlightshadow threedshadow window windowframe windowtext"
  ).split(" "),
);
const whitespace = /[ \t\n\f\r]/;
const identifierPart = /[a-zA-Z0-9_-]/;
const unsupported = {
  kind: "unsupported-or-unrecognized",
  exceededLimit: null,
} as const;

function skipSpace(text: string, i: number): number {
  while (i < text.length && whitespace.test(text.charAt(i))) i++;
  return i;
}

function quotedEnd(text: string, start: number): number {
  const end = text.indexOf(text.charAt(start), start + 1);
  if (end < 0 || /[^\t\x20-\x7e]|\\/.test(text.slice(start + 1, end)))
    return -1;
  return end + 1;
}

function urlEnd(text: string, position: number): number {
  let start = skipSpace(text, position);
  let end = start;
  const first = text.charAt(start);
  let after: number;
  if (first === "'" || first === '"') {
    after = quotedEnd(text, start);
    if (after < 0) return -1;
    start++;
    end = after - 1;
  } else {
    while (
      end < text.length &&
      text[end] !== ")" &&
      !whitespace.test(text.charAt(end))
    ) {
      if (/['"(]/.test(text.charAt(end))) return -1;
      end++;
    }
    after = end;
  }
  if (end === start || !referenceCharacters(text.slice(start, end))) return -1;
  after = skipSpace(text, after);
  return text[after] === ")" ? after + 1 : -1;
}

interface PaintFunction {
  start: number;
  end: number;
  name: string;
  hasVariable: boolean;
}
type ScanResult =
  | PaintFunction[]
  | Extract<PaintValue, { kind: "unsupported-or-unrecognized" }>;

// Retain only complete top-level functions: the root and optional URL fallback.
// Nested variable dependencies propagate through balanced frames, without recursion.
function scan(text: string, limits: InterpretationLimits): ScanResult {
  const functions: PaintFunction[] = [];
  const stack: { start: number; name: string; variablesBefore: number }[] = [];
  const number = new RegExp(numberPattern.source, "y");
  let variables = 0;
  let i = 0;
  while (i < text.length) {
    const c = text.charAt(i);
    if (whitespace.test(c)) {
      i++;
      continue;
    }
    if (/[^\x20-\x7e]|[\\{}[\];]/.test(c) || text.startsWith("/*", i))
      return unsupported;
    if (c === "'" || c === '"') {
      i = quotedEnd(text, i);
      if (i < 0) return unsupported;
      continue;
    }
    if (c === "#") {
      i++;
      while (identifierPart.test(text.charAt(i))) i++;
      continue;
    }
    number.lastIndex = i;
    if (number.test(text)) {
      if (number.lastIndex - i > limits.maxNumericTokenCharacters)
        return { ...unsupported, exceededLimit: "maxNumericTokenCharacters" };
      i = number.lastIndex;
      if (text[i] === "%") i++;
      else while (identifierPart.test(text.charAt(i))) i++;
      continue;
    }
    if (/[a-zA-Z_-]/.test(c)) {
      const start = i++;
      while (identifierPart.test(text.charAt(i))) i++;
      if (text[i] !== "(") continue;
      if (stack.length >= limits.maxNestingDepth)
        return { ...unsupported, exceededLimit: "maxNestingDepth" };
      const name = text.slice(start, i).toLowerCase();
      i++;
      if (name === "url") {
        i = urlEnd(text, i);
        if (i < 0) return unsupported;
        if (!stack.length)
          functions.push({ start, end: i, name, hasVariable: false });
      } else {
        stack.push({ start, name, variablesBefore: variables });
        if (name === "var") {
          i = skipSpace(text, i);
          const keyStart = i;
          while (identifierPart.test(text.charAt(i))) i++;
          if (i - keyStart < 3 || !text.startsWith("--", keyStart))
            return unsupported;
          i = skipSpace(text, i);
          if (text[i] !== "," && text[i] !== ")") return unsupported;
          variables++;
        }
      }
      continue;
    }
    if (c === "(") return unsupported;
    if (c === ")") {
      const frame = stack.pop();
      if (!frame) return unsupported;
      if (!stack.length)
        functions.push({
          start: frame.start,
          end: i + 1,
          name: frame.name,
          hasVariable: variables > frame.variablesBefore,
        });
    }
    i++;
  }
  return stack.length ? unsupported : functions;
}

export function classifyPaint(
  raw: string,
  limits: InterpretationLimits,
): PaintValue {
  if (raw.length > limits.maxPaintCharacters)
    return { ...unsupported, exceededLimit: "maxPaintCharacters" };
  const start = skipSpace(raw, 0);
  let end = raw.length;
  while (end > start && whitespace.test(raw.charAt(end - 1))) end--;
  const text = raw.slice(start, end);
  const functions = scan(text, limits);
  if (!Array.isArray(functions)) return functions;
  const lower = text.toLowerCase();
  if (lower === "none") return { kind: "no-paint" };
  if (contextKeywords.has(lower)) return { kind: "requires-context" };
  const root = functions[0];
  if (root?.start === 0 && root.name === "url") {
    if (root.end === text.length) return { kind: "resource-reference" };
    const fallbackStart = skipSpace(text, root.end);
    if (fallbackStart === root.end) return unsupported;
    const fallback = lower.slice(fallbackStart);
    const next = functions[1];
    if (
      fallback === "none" ||
      fallback === "currentcolor" ||
      (next?.start === fallbackStart &&
        next.end === text.length &&
        next.hasVariable) ||
      literalColor(fallback)
    )
      return { kind: "resource-reference" };
    return unsupported;
  }
  if (root?.start === 0 && root.end === text.length && root.hasVariable)
    return { kind: "requires-context" };
  const color = literalColor(text);
  return color ? { kind: "literal", color } : unsupported;
}
