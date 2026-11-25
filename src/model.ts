/** Authored evidence is XML-processed text, never computed style or a resolved resource. */
export type TargetSource =
  "text-content" | "fill" | "stroke" | "href" | "xlink-href";
export type TargetDefault =
  | {
      readonly state: "present";
      readonly raw: string;
      readonly source: TargetSource;
    }
  | {
      readonly state: "absent";
      readonly raw: null;
      readonly source: "fill" | "stroke" | null;
    };
export type InputDefault =
  | { readonly state: "common"; readonly raw: string }
  | { readonly state: "mixed" | "absent"; readonly raw: null };
export type Hook = "text" | "image" | "fill" | "stroke";
export type InputKind = "text" | "image" | "paint";
export interface TemplateTarget {
  readonly hook: Hook;
  readonly elementName: string;
  readonly default: TargetDefault;
}
export interface TemplateInput {
  readonly key: string;
  readonly label: string;
  readonly kind: InputKind;
  readonly targets: readonly TemplateTarget[];
  readonly default: InputDefault;
  readonly description: string | null;
  readonly labelSource: "key" | "element" | "metadata";
  readonly order: number | null;
}
export interface InputGroup {
  readonly key: string | null;
  readonly label: string | null;
  readonly description: string | null;
  readonly order: number | null;
  readonly inputs: readonly TemplateInput[];
}
export interface InspectionLimits {
  readonly maxSourceBytes: number;
  readonly maxSourceCharacters: number;
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxAttributesPerElement: number;
  readonly maxTargets: number;
}
export interface BindingLimits {
  readonly maxBindings: number;
  readonly maxValueCharacters: number;
  readonly maxTotalValueCharacters: number;
  readonly maxImageBytes: number;
  readonly maxTotalImageBytes: number;
  readonly maxMediaTypeCharacters: number;
  readonly maxOutputBytes: number;
}
export type InspectionOptions = Partial<InspectionLimits>;
export type BindingOptions = Partial<BindingLimits>;
export type Binding =
  | {
      readonly key: string;
      readonly kind: "text" | "paint" | "image-reference";
      readonly value: string;
    }
  | {
      readonly key: string;
      readonly kind: "image-content";
      readonly bytes: Uint8Array;
      readonly mediaType: string;
    };
export interface BoundSvg {
  readonly svg: string;
  toUtf8(): Uint8Array;
}
export interface Template {
  readonly inputs: readonly TemplateInput[];
  readonly groups: readonly InputGroup[];
  bind(
    bindings: readonly Binding[],
    options?: BindingOptions,
  ): Result<BoundSvg>;
}
export type ErrorCode =
  | "xml-parse"
  | "unsupported-template"
  | "invalid-template"
  | "invalid-binding"
  | "limit-exceeded";
export type LimitName = keyof InspectionLimits | keyof BindingLimits;
export interface SvtError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly inputKey?: string;
  readonly limit?: LimitName;
}
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SvtError };
