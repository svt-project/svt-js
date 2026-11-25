# SVT for TypeScript

Inspect named inputs in SVG templates and replace text, paint, or images while preserving the
surrounding artwork. SVG owns geometry and layout; SVT supplies literal values without evaluating
CSS, loading resources, or rendering the document.

```ts
import { inspect } from "svt-typescript";

const inspection = inspect(xmlText); // string or UTF-8 Uint8Array
if (!inspection.ok) {
  console.error(inspection.error.message);
} else {
  const result = inspection.value.bind([
    { key: "heading", kind: "text", value: "Welcome" },
    { key: "accent", kind: "paint", value: "#336699" },
  ]);
  if (result.ok) {
    const svgText = result.value.svg;
    const utf8Bytes = result.value.toUtf8();
  }
}
```

Inspection exposes immutable authored defaults, target lists, labels, descriptions and presentation
groups. Each bind starts from the captured template. Omitted inputs preserve original content;
empty strings are explicit replacements. A failed operation returns no partial template or output.

The same synchronous core runs in Node, browser code and dedicated Workers. Hosts own Worker
scheduling, deadlines, termination, resource access and safe SVG previews. The parser is the scoped
`@xmldom/xmldom` package; its DOM and mutable buffers remain private.

- [API and processing policy](docs/api.md)
- [Resource limits and their enforcement boundaries](docs/resource-policy.md)
- [Conformance and validation](docs/conformance.md)
- [Contributing](CONTRIBUTING.md)
- [Canonical specification](https://github.com/svt-project/svt-spec)
- [Project site](https://svt-project.github.io/)

Templates use marker `1.0` and metadata namespace `https://svt-project.github.io/ns/svt`.
This implementation supports inspection and binding; optional authored-value interpretation is a
separate follow-up. The accepted reference snapshot identifies a reviewed, unpublished specification
candidate; it does not rename an earlier publication. See [provenance](conformance/SNAPSHOT.json).

Build a source checkout with `npm ci --ignore-scripts` and `npm run build`. The package has ESM exports and generated
TypeScript declarations, and remains private while npm naming and publication are decided. No
package or specification release is implied by this repository.

Repository-authored material is MIT-licensed; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
