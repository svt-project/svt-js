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

## Authored paint and image values

After inspection, pass a single `TemplateTarget` to `interpretPaint(target, options?)` for fill or
stroke, or `interpretImage(target, options?)` for images. Every result retains the supplied target,
including its raw XML-processed default and attribute source. The result's `kind` narrows its type.

| Operation | Results                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paint     | `literal` supplies `color.red`, `green`, `blue`, and `alpha` as normalized sRGB components in [0, 1]. Other kinds are `absent`, `no-paint`, `requires-context`, `resource-reference`, and `unsupported-or-unrecognized`. |
| Image     | `data-uri` supplies `declaredMediaType`, lowercased or `null` if omitted. Other kinds are `absent`, `empty`, `fragment-reference`, `relative-reference`, `absolute-reference`, and `unsupported-or-unrecognized`.        |

For example, a picker can display the same red swatch for `red` and `#f00`. If these spellings
occur on targets of one shared key, its raw default stays `mixed`. Keep each authored value until
the user makes an explicit edit. A paint server such as `url(#ink) red` has no literal color result.
Image interpretation examines reference syntax or the data URI header and leaves the payload opaque.
A declared media type describes the header only.

Both interpreters are synchronous and independent of inspection and binding. They use the
[SVT 1.0 interpretation grammar](https://github.com/svt-project/svt-spec/blob/v1.0.0/spec/interpretation.md).
An unsupported result carries `exceededLimit`, which names the configured limit if one was reached
and otherwise is `null`. Wrong target kinds throw `TypeError`. Options follow the same positive
safe-integer convention as inspection and binding. The exported `defaultInterpretationLimits` allow
4,096 UTF-16 units for paint or ordinary image references, 1,024 for a data URI header including
its comma, 64 per numeric paint token, and 16 nested paint functions.

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

Every binding also has `key: string`. One assignment updates every target of that key. Text and
image keys can repeat just as paint keys can. A template mixing input kinds under one key fails
inspection. Duplicate assignments, unknown keys, wrong kinds, and
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
[Worker integration](integration.md).
