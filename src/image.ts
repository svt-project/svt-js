import type { ImageValue, InterpretationLimits } from "./interpretation.js";

// ASCII URI characters and complete percent escapes. Classification never resolves a URL.
export function referenceCharacters(text: string): boolean {
  return (
    !/[^A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]/.test(text) &&
    !/%(?![0-9a-fA-F]{2})/.test(text)
  );
}
const mimeToken = /^[a-zA-Z0-9!$%&^_.+-]+$/;
const unsupported = {
  kind: "unsupported-or-unrecognized",
  exceededLimit: null,
} as const;

function dataHeader(text: string, maximum: number): ImageValue {
  // Stop at the comma even when the caller supplies a very large limit.
  const end = Math.min(maximum, text.length);
  let comma = 0;
  while (comma < end && text[comma] !== ",") {
    if (text[comma] === "#") return unsupported;
    comma++;
  }
  if (comma === end)
    return {
      ...unsupported,
      exceededLimit:
        text.length > maximum ? "maxDataUriHeaderCharacters" : null,
    };
  const [type, ...parameters] = text.slice(5, comma).split(";");
  let declaredMediaType: string | null = null;
  if (type) {
    const parts = type.split("/");
    if (parts.length !== 2 || !parts.every((part) => mimeToken.test(part)))
      return unsupported;
    declaredMediaType = type.toLowerCase();
  }
  for (const [index, token] of parameters.entries()) {
    if (/^base64$/i.test(token) && index === parameters.length - 1) continue;
    const equals = token.indexOf("=");
    if (equals < 1 || !mimeToken.test(token.slice(0, equals)))
      return unsupported;
    const value = token.slice(equals + 1);
    if (!value || value.includes("'") || !referenceCharacters(value))
      return unsupported;
  }
  return { kind: "data-uri", declaredMediaType };
}

export function classifyImage(
  raw: string,
  limits: InterpretationLimits,
): ImageValue {
  if (!raw) return { kind: "empty" };
  if (/^data:/i.test(raw))
    return dataHeader(raw, limits.maxDataUriHeaderCharacters);
  if (raw.length > limits.maxReferenceCharacters)
    return { ...unsupported, exceededLimit: "maxReferenceCharacters" };
  if (!referenceCharacters(raw)) return unsupported;
  if (raw.startsWith("#")) return { kind: "fragment-reference" };
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw))
    return { kind: "absolute-reference" };
  if (/^[^/?#:]*:/.test(raw)) return unsupported;
  return { kind: "relative-reference" };
}
