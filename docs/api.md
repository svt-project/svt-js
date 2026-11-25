# JavaScript API and processing policy

The core provides synchronous inspection and binding with whole-template rejection and typed
results. Hosts own Worker execution. Resource limits are documented separately in
[resource policy](resource-policy.md). The implementation uses the reviewed conforming-input
candidate; see [snapshot provenance](../conformance/SNAPSHOT.json).

## Scope and dependencies

Use the scoped `@xmldom/xmldom` package, initially pinned to the tested 0.9.12. Keep parser classes
private. Support browser main thread, dedicated Workers and Node with the same core. No React,
network, filesystem, renderer, automatic Worker scheduling or second CLI in core. The npm identity is `@svt-project/svt-js`; publication remains a separate decision.

The core implements inspection, presentation metadata and atomic binding. Optional authored paint/image
interpretation is a separate API and acceptance milestone, not part of inspection or binding. Do
not claim that optional conformance profile until its cases pass. No schema or SVG property validator.

## API shape

```ts
export function inspect(
  source: string | Uint8Array,
  options?: InspectionOptions,
): Result<Template>;

export interface Template {
  readonly inputs: readonly TemplateInput[];
  readonly groups: readonly InputGroup[];
  bind(
    bindings: readonly Binding[],
    options?: BindingOptions,
  ): Result<BoundSvg>;
}

export type Binding =
  | { readonly key: string; readonly kind: "text"; readonly value: string }
  | { readonly key: string; readonly kind: "paint"; readonly value: string }
  | {
      readonly key: string;
      readonly kind: "image-reference";
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

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SvtError };
```

Use an assignment array rather than a string dictionary: explicit kinds prevent ambiguity, shared
paint targets remain one assignment, and accidental duplicate keys can be rejected. Omission keeps
original content; empty strings deliberately replace it. No binding session, implicit color
normalization, auto-fetching image source or default/unassigned sentinel.

Source strings are already decoded XML; callers own their preceding decoding. The byte overload
supports UTF-8, including a UTF-8 BOM, using fatal decoding; other byte encodings are unsupported in
the initial profile. Byte input must declare UTF-8 if an encoding is present; the parsed declaration is checked before
returning a template. String input has already been decoded, so its encoding declaration is not used
to select or validate a decoder. This is an explicit TypeScript capability policy,
not removal of .NET UTF-16 support or a portable format restriction.

After a call returns, no mutable caller buffer or binding collection is retained. Input bytes are
captured after admission checks when necessary; image bytes are captured for a bind and need no
separate public EncodedImage factory in this profile. Concurrent mutation during a call is unsupported;
reject SharedArrayBuffer-backed byte views rather than pretend a racing copy is atomic. BoundSvg
contains immutable text and returns a fresh UTF-8 buffer. DOM state never escapes. Runtime-freeze
inventory/result records and arrays; TypeScript readonly alone is insufficient for this promise.
Every bind starts from the captured template, independently of previous outputs.

## Inventory model

Preserve the specification's distinctions using discriminated unions and explicit nulls:

- TemplateInput: exact key, effective label, text/image/paint kind, ordered targets, raw default
  summary, description, label source and optional numeric presentation order.
- Target: text/image/fill/stroke hook, SVG local element name and authored default evidence. Present
  means a string, including empty; absent has no raw value. Evidence retains text/fill/stroke/href/
  XLink origin. Do not expose parsed CSS, inferred resource locations or mutable XML.
- Input summary: common with a raw string, mixed, or absent. Never infer equality by rendered color.
- InputGroup: nullable key/label/description/order for the unnamed section, ordered references to
  the same inventory inputs. Group presentation never reorders the structural inputs/targets.

Errors currently omit source coordinates. Exact hook-attribute positions are not reconstructed.
Messages are explanatory; only the documented code/key/limit fields are machine contracts.

## Error and recovery policy

Return a failure result for expected input/operation failures: XML parsing, unsupported root/marker,
nonconforming SVT declarations, invalid assignments and resource refusal. Use a small stable
classification (`xml-parse`, `unsupported-template`, `invalid-template`, `invalid-binding`,
`limit-exceeded`) with explanatory message, optional input key and optional limit name. Message wording and mixed-fault precedence are not compatibility contracts.

Reject the entire operation on the first detected relevant failure. No partial template or output,
warning collection, unknown-key ignore mode or scoped metadata salvage in this profile. Reject duplicate
assignments, wrong kinds, unknown keys and XML-unrepresentable replacement strings. This simpler
policy is allowed by the relaxed spec; .NET's tolerant authoring model remains separate.

Recognized invalid metadata is distinct from valid foreign/explicitly ignored content. Do not
reject unknown SVG elements, unfamiliar paint/reference strings or permitted opaque metadata just
because they are unfamiliar. The normal parser remains responsible for malformed XML reporting;
we are not implementing an independent XML validator.

Use xmldom's error-level stop policy: reported errors and fatal errors fail inspection; warnings
alone do not. A warning may describe valid content, such as a literal Unicode replacement character
(U+FFFD). Warning-only handling of malformed XML belongs to the parser and is not a portability or
recovery guarantee. UTF-8 byte decoding remains fatal on invalid byte sequences.

Invalid options, wrong runtime argument shapes and programmer misuse throw TypeError/RangeError.
Do not catch arbitrary defects or allocation failures and label them malformed user input.

## Execution and cancellation

Keep core operations synchronous. Do not add Promise wrappers or an AbortSignal parameter that
suggests an active xmldom call can process queued cancellation events. A host can call the core in a
Worker, keep the Template there, and exchange serializable inventory/results. Template handles are
not transferable DOM objects.

The host owns Worker queue limits, elapsed-time deadlines, termination and recreation. Terminating
active work discards Worker-held templates; reload/reinspect source when needed. Host cancellation
is distinct from an engine error and should not become an XML diagnostic. Test this host boundary
before the cookbook relies on it. Worker termination improves responsiveness but is not a hard
process/browser memory ceiling; adversarial multitenant server work requires host-level isolation.
The library does not ship a Worker client or retain a host scheduling policy.

## Validation obligations

- Adopt a reviewed stamped canonical snapshot; preserve independent tests and differential checks.
  Do not fetch live spec assets. Spec candidate publication is a separate action.
- Execute all inspection/substitution cases, byte-boundary cases, repeated binding ownership and
  parser-preservation regressions in Node and selected browser engines.
- Cover equality/excess for actual implemented limits, input/output expansion and atomic failures.
  Measure representative documents and revisit defaults before describing production support.
- Verify no external entity/resource loading, escaped literal values and complete output. The engine
  preserves authored SVG; safe preview/rendering remains a host capability, not an SVT sanitizer.
- Preserve XML 1.0 line normalization and the text-CR serialization invariant from the spike. Do not
  accept external DOM objects or add raw-markup replacement without reopening that design.
- Keep a pinned dependency, legal notices, strict TypeScript declarations and consumer packaging
  checks. Optional interpretation gets its own acceptance suite when added.
