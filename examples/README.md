# Runnable examples

From a source checkout, install once with `npm ci --ignore-scripts`. The examples import
`@svt-project/svt-js` through the same package exports used by consumers. No npm publication is needed.

## Node: inspect, bind, and embed an image

```sh
npm run example:node
```

[bind.mjs](node/bind.mjs) reads [template.svg](template.svg), lists its inputs, binds text and a
shared fill/stroke color, embeds [artwork.svg](artwork.svg), and writes
`artifacts/examples/invitation.svg`. Open that output in an SVG viewer.

For another output path, build once and run:

```sh
npm run build
node examples/node/bind.mjs ./invitation.svg
```

The host reads files and supplies their bytes; the library never resolves file paths or URLs.

## Browser: live updates in a Worker

```sh
npm run example:browser
```

Open `http://127.0.0.1:8787/`. Edit the heading and accent, reset to authored values, or cancel a
preview. Stop the local server with Ctrl+C. This uses the existing esbuild development tool to
bundle the demo; it adds no runtime framework.

- [worker.js](live-preview/worker.js) retains the inspected template and returns plain SVG/results.
- [controller.js](live-preview/controller.js) allows one active request and one pending state.
- [main.js](live-preview/main.js) connects the controls to an image preview and releases Blob URLs.

Updates are complete form states, not patches. New edits replace the pending state; superseded
results are ignored. Cancellation or a five-second deadline terminates the Worker. The next edit
creates another Worker and reloads the source. Reset sends no bindings, preserving authored defaults.

This is host-side example code, not a Worker API shipped by the core. Copy and adapt its policy for
your application. Read [integration guidance](../docs/integration.md) before accepting external artwork.
The demo uses only its own trusted template; it is not a general SVG upload viewer.
