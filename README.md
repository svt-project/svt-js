# SVT for JavaScript

[![Validation](https://github.com/svt-project/svt-js/actions/workflows/validate.yml/badge.svg?branch=master)](https://github.com/svt-project/svt-js/actions/workflows/validate.yml)
[![Codecov](https://codecov.io/gh/svt-project/svt-js/branch/master/graph/badge.svg)](https://app.codecov.io/gh/svt-project/svt-js/tree/master)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Inspect named inputs in SVG artwork and bind text, paint, or images. The same synchronous library
runs in Node, browsers, and Workers. SVG keeps control of layout and rendering.

The package name is **`@svt-project/svt-js`**. Include the scope in imports and dependencies;
`svt-js` is a different npm package. Install the published candidate with `npm install @svt-project/svt-js@rc`.
To try the example from this checkout:

```sh
npm ci --ignore-scripts
npm run example:node
```

This writes a [sample invitation](examples/template.svg), with new text, a shared accent color,
and an embedded image, to `artifacts/examples/invitation.svg`.

## Inspect and bind

```ts
import { inspect } from "@svt-project/svt-js";

const source = `<svg xmlns="http://www.w3.org/2000/svg"
    width="320" height="80" data-svt-version="1.0">
  <text x="16" y="48" font-size="28" fill="#007b67"
    data-svt-text="heading" data-svt-fill="accent">Hello</text>
</svg>`;
const inspection = inspect(source); // Also accepts UTF-8 Uint8Array.
if (!inspection.ok) throw new Error(inspection.error.message);

const template = inspection.value;
console.log(template.inputs); // Keys, labels, kinds, targets, and authored defaults.
const result = template.bind([
  { key: "heading", kind: "text", value: "Welcome <everyone>" },
  { key: "accent", kind: "paint", value: "#336699" },
]);
if (!result.ok) throw new Error(result.error.message);

console.log(result.value.svg); // Replacement text is escaped, not treated as XML.
const bytes = result.value.toUtf8();
```

Reuse the inspected template for each variation. Omitted keys keep their authored values; empty
strings replace them. Invalid input returns a failure with no partial output.

## Examples and guides

- [Runnable examples](examples/README.md): files and image embedding in Node; live browser preview.
- [Worker integration](docs/integration.md): coalescing, cancellation, deadlines, and preview cleanup.
- [API reference](docs/api.md): bindings, inventory, errors, and ownership.
- [Authored paint and image values](docs/api.md#authored-paint-and-image-values) for editor controls.
- [Resource limits](docs/resource-policy.md) and [conformance](docs/conformance.md).
- [Changelog](CHANGELOG.md), [contributing](CONTRIBUTING.md), and [security](SECURITY.md).

SVT does not fetch references, evaluate replacements, render SVG, or sanitize authored artwork.
Hosts own resource access and preview isolation. Templates use format marker `1.0`; central metadata
uses `https://svt-project.github.io/ns/svt`. See the [specification](https://github.com/svt-project/svt-spec)
and [project site](https://svt-project.github.io/).

ESM with TypeScript declarations; Node 24+ for Node usage. Browser builds use standard Web APIs.
CI tests dedicated Workers in Chromium, Firefox, and WebKit. See [browser coverage](docs/conformance.md).
Licensed under [MIT](LICENSE); [NOTICE](NOTICE) preserves attribution.
