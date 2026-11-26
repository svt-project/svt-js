# Changelog

Consumer-facing changes are recorded here. Package versions are independent of the template format.

## Unreleased

- Interpret authored paint and image values per target, preserving the original evidence and shared defaults.

## 1.0.0-rc.2

- Accept UTF-8 template bytes and encoded image bytes from same-origin iframes, including subarrays.
- Adopt the stable SVT 1.0.0 specification with the same canonical reference assets.

## 1.0.0-rc.1

- Inspect format `1.0` SVG templates, exposing named inputs, authored defaults, labels, and groups.
- Bind text, paint, image references, and encoded image bytes with whole-operation rejection,
  reusable immutable templates, and UTF-8 output. A single input key can update any number of
  targets of the same kind.
- Support ESM consumers in Node, browsers, and dedicated Workers, with strict TypeScript declarations.
- Preserve conforming XML containing U+FFFD when the parser reports a warning rather than an error.
- Avoid repeated child-list reindexing when binding fragmented text, preserving comments and processing instructions.
- Add runnable Node and Worker examples, including coalesced updates, cancellation, deadlines, and
  preview cleanup. Worker scheduling remains host-owned.
