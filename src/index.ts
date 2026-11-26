import type { InspectionOptions, Result, Template } from "./model.js";
import { attempt, defaultInspectionLimits, options, reject } from "./policy.js";
import { parse } from "./xml.js";
import { inventory } from "./inventory.js";
import { bind } from "./binding.js";
export type * from "./model.js";
export { defaultInspectionLimits, defaultBindingLimits } from "./policy.js";
/** Inspect supplied XML without resolving resources, rendering SVG, or exposing mutable DOM. */
export function inspect(
  source: string | Uint8Array,
  configuration?: InspectionOptions,
): Result<Template> {
  const limits = options(defaultInspectionLimits, configuration);
  return attempt(() => {
    const doc = parse(source, limits),
      root = doc.documentElement;
    if (!root) reject("unsupported-template", "Expected an SVG document.");
    const found = inventory(root, limits);
    return Object.freeze({
      inputs: found.inputs,
      groups: found.groups,
      bind: (assignments, config) => bind(doc, found, assignments, config),
    } satisfies Template);
  });
}

export {
  interpretPaint,
  interpretImage,
  defaultInterpretationLimits,
} from "./interpretation.js";
export type {
  PaintInterpretation,
  ImageInterpretation,
  InterpretationLimits,
  InterpretationOptions,
  SrgbColor,
} from "./interpretation.js";
