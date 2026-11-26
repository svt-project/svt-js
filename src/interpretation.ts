import type { TemplateTarget } from "./model.js";
import { options } from "./policy.js";
import { classifyPaint } from "./paint.js";
import { classifyImage } from "./image.js";

export interface InterpretationLimits {
  readonly maxPaintCharacters: number;
  readonly maxReferenceCharacters: number;
  readonly maxDataUriHeaderCharacters: number;
  readonly maxNumericTokenCharacters: number;
  readonly maxNestingDepth: number;
}
export type InterpretationOptions = Partial<InterpretationLimits>;
export const defaultInterpretationLimits: InterpretationLimits = Object.freeze({
  maxPaintCharacters: 4096,
  maxReferenceCharacters: 4096,
  maxDataUriHeaderCharacters: 1024,
  maxNumericTokenCharacters: 64,
  maxNestingDepth: 16,
});

export interface SrgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}
type Unsupported = {
  readonly kind: "unsupported-or-unrecognized";
  readonly exceededLimit: keyof InterpretationLimits | null;
};
export type PaintValue =
  | { readonly kind: "literal"; readonly color: SrgbColor }
  | {
      readonly kind:
        "absent" | "no-paint" | "requires-context" | "resource-reference";
    }
  | Unsupported;
export type ImageValue =
  | { readonly kind: "data-uri"; readonly declaredMediaType: string | null }
  | {
      readonly kind:
        | "absent"
        | "empty"
        | "fragment-reference"
        | "relative-reference"
        | "absolute-reference";
    }
  | Unsupported;
export type PaintInterpretation = {
  readonly target: TemplateTarget;
} & PaintValue;
export type ImageInterpretation = {
  readonly target: TemplateTarget;
} & ImageValue;

function authoredValue(target: TemplateTarget): string | null {
  const evidence = target.default;
  if (evidence?.state === "absent" && evidence.raw === null) return null;
  if (evidence?.state === "present" && typeof evidence.raw === "string")
    return evidence.raw;
  throw new TypeError("Expected a target with authored default evidence.");
}

export function interpretPaint(
  target: TemplateTarget,
  configuration?: InterpretationOptions,
): PaintInterpretation {
  if (target?.hook !== "fill" && target?.hook !== "stroke")
    throw new TypeError("Expected a fill or stroke target.");
  const limits = options(defaultInterpretationLimits, configuration);
  const raw = authoredValue(target);
  return Object.freeze({
    target,
    ...(raw === null
      ? { kind: "absent" as const }
      : classifyPaint(raw, limits)),
  });
}

export function interpretImage(
  target: TemplateTarget,
  configuration?: InterpretationOptions,
): ImageInterpretation {
  if (target?.hook !== "image")
    throw new TypeError("Expected an image target.");
  const limits = options(defaultInterpretationLimits, configuration);
  const raw = authoredValue(target);
  return Object.freeze({
    target,
    ...(raw === null
      ? { kind: "absent" as const }
      : classifyImage(raw, limits)),
  });
}
