# Conformance and validation

The implementation accepts template format `1.0`. It embeds an explicitly reviewed snapshot from
[svt-spec](https://github.com/svt-project/svt-spec), identified by
[SNAPSHOT.json](../conformance/SNAPSHOT.json) and its complete hashed inventory. The source is the
conforming-input candidate in [spec PR #2](https://github.com/svt-project/svt-spec/pull/2), not a
published replacement for specification `1.0.0-rc.1`. Snapshot acceptance does not merge or publish
the specification. Future updates require explicit review of the source, manifest and observations.

Inspection and substitution are the implemented profiles: 14 canonical inspection cases and seven
substitution cases. The runner maps public TypeScript records to language-neutral observations.
Binding compares semantic XML rather than attribute order, prefix spelling or CDATA formatting;
repeat binds, omissions and UTF-8 export are checked separately. Python minidom/Expat independently
compares outputs to expected SVGs and the JavaScript semantic projection.

The full 59-file asset set and its MIT license are retained. Optional interpretation cases and named
colors are inventoried but not executed: authored paint/image interpretation is not implemented.
Do not treat their presence as an acceptance claim. Canonical assets are read from this checkout,
never fetched from the specification during builds or tests.

Local policy tests cover whole-template rejection, recognized metadata errors versus opaque
content, byte admission, private ownership, literal injection, immutable records, image encoding,
resource equality/excess and output expansion. An independently constructed SVG over 2 MiB
exercises the larger defaults without using private authoring files. It is a correctness scenario,
not a throughput or maximum-memory promise.

The browser runner bundles the same library and canonical cases into a real dedicated Worker.
Additional cases exercise UTF-8 capture, text/CR escaping, image bytes, resource rejection, no
external loading and multi-megabyte artwork without Node or native DOM globals. Host-owned Worker
cancellation, other browser engines and renderer behavior are separate integration responsibilities.

The current library does not certify XML well-formedness independently of its parser, validate SVG
schemas or property values, sanitize previews, establish resource safety, or promise a hard memory
ceiling. See [processing policy](api.md) and [resource enforcement](resource-policy.md).
