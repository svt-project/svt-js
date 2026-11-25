# API reference

Import from `@svt-project/svt-js`. The package exposes synchronous functions and immutable records;
parser and DOM types stay private. See [examples](../examples/README.md) for runnable code.

## Inspection

```ts
inspect(source: string | Uint8Array, options?: InspectionOptions): Result<Template>
```

Strings are already-decoded XML. Byte input must be UTF-8 (a UTF-8 BOM is allowed); invalid byte
sequences and conflicting encoding declarations fail. Format marker `1.0` is required.
XML 1.0 is supported; DTD declarations are rejected. The parser does not load external resources.

`Template.inputs` lists discovered inputs in structural order. Each input has:

| Field                  | Meaning                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `key`, `kind`          | Exact binding key and `text`, `paint`, or `image` kind.                                     |
| `label`, `labelSource` | Effective label and its origin: `key`, `element`, or `metadata`.                            |
| `description`, `order` | Authored presentation metadata, or `null`.                                                  |
| `targets`              | Ordered hooks (`text`, `image`, `fill`, `stroke`), element names, and raw default evidence. |
| `default`              | `common` with a raw string, or `mixed`/`absent` with `raw: null`.                           |

A target default is `present` with a string (including empty), or `absent` with `raw: null`.
Its source distinguishes text, fill, stroke, href, and XLink evidence. Values are XML-processed
strings, not computed CSS or resolved resources.

`Template.groups` supplies presentation order and references the same input records. Group
key/label/description/order can be `null` for the unnamed section. Grouping does not reorder
`Template.inputs` or the targets within an input.

## Binding

```ts
template.bind(bindings: readonly Binding[], options?: BindingOptions): Result<BoundSvg>
```

| Kind              | Payload                                  | Effect                                                         |
| ----------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `text`            | `value: string`                          | Literal text replacement.                                      |
| `paint`           | `value: string`                          | Literal paint applied to every fill/stroke target for the key. |
| `image-reference` | `value: string`                          | Literal href/reference; nothing is fetched.                    |
| `image-content`   | `bytes: Uint8Array`, `mediaType: string` | Embed supplied bytes as a base64 data URI.                     |

Every binding also has `key: string`. Duplicate keys, unknown keys, wrong kinds, and
XML-unrepresentable values fail the whole bind. Strings are not evaluated as markup, CSS, or code;
paint and image references are not validated against a renderer's capabilities.

Each bind starts from the captured template. Omitted keys preserve authored content; an empty
string is an explicit replacement. `BoundSvg.svg` is the complete output string and `toUtf8()`
returns a fresh byte array on every call.

## Results and errors

`Result<T>` is `{ ok: true, value: T }` or `{ ok: false, error: SvtError }`. Failures expose no
partial template/output. `SvtError` has a code and message, plus optional `inputKey` and `limit`.

| Code                   | Meaning                                            |
| ---------------------- | -------------------------------------------------- |
| `xml-parse`            | Parser, byte-decoding, or XML admission failure.   |
| `unsupported-template` | Unsupported root or template marker.               |
| `invalid-template`     | Detected invalid SVT hooks or recognized metadata. |
| `invalid-binding`      | Invalid replacement assignment.                    |
| `limit-exceeded`       | A configured operation limit was exceeded.         |

Use codes, keys, and limit names for program logic. Message wording, source positions, and ordering
among multiple faults are not contracts. Invalid options or runtime argument shapes throw
`TypeError`/`RangeError`; programming defects and allocation failures are not converted to input errors.

Parser errors/fatal errors reject inspection; warnings alone do not. Recognized invalid SVT metadata
fails the operation, while permitted foreign/ignored content remains opaque. The library adds no
independent XML validator or partial-recovery mode.

## Ownership and limits

Records and arrays are frozen at runtime. No mutable input buffer or binding collection is retained
after a call. SharedArrayBuffer-backed views are rejected; concurrent mutation during a call is
unsupported. The DOM never escapes through the public API.

`InspectionOptions` and `BindingOptions` override individual values from exported
`defaultInspectionLimits` and `defaultBindingLimits`. See [resource policy](resource-policy.md) for
defaults and enforcement timing. There is no global mutable configuration.

Hosts own files, networks, rendering, queues, cancellation, and deadlines. See
[Worker integration](integration.md). Optional authored-value interpretation is not implemented;
inspection retains raw evidence rather than normalizing colors or image references.
