# Changelog

Consumer-facing changes are recorded here. Package versions are independent of the template format.

## Unreleased

- Inspect format `1.0` SVG templates, exposing named inputs, authored defaults, labels, and groups.
- Bind text, shared paint targets, image references, and encoded image bytes with whole-operation
  rejection, reusable immutable templates, and UTF-8 output.
- Support ESM consumers in Node, browsers, and dedicated Workers, with strict TypeScript declarations.
- Preserve conforming XML containing U+FFFD when the parser reports a warning rather than an error.
- Avoid repeated child-list reindexing when binding fragmented text, preserving comments and processing instructions.
- Add runnable Node and Worker examples, including coalesced updates, cancellation, deadlines, and
  preview cleanup. Worker scheduling remains host-owned.
