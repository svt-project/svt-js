import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { inspect } from "../dist/index.js";
import { svg, success, semantics } from "./support.mjs";

test("inspection and image binding leave external resources unresolved", (t) => {
  const calls = [];
  for (const [object, names] of [
    [fs, ["readFileSync", "readFile", "openSync", "open", "createReadStream"]],
    [fs.promises, ["readFile", "open"]],
    [net, ["connect", "createConnection"]],
    [http, ["get", "request"]],
    [https, ["get", "request"]],
    [globalThis, ["fetch"]],
  ]) {
    for (const name of names) {
      t.mock.method(object, name, () => {
        calls.push(name);
        throw new Error("Unexpected resource access: " + name);
      });
    }
  }
  // Cover named imports of the mocked Node APIs as well as default imports.
  syncBuiltinESMExports();
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });

  const file = "file:///example.svg";
  const remote = "https://example.invalid/example.svg";
  const source = svg(`<image data-svt-image="asset" href="${file}"/>`);
  const rejected = inspect(`<!DOCTYPE svg SYSTEM "${remote}">${source}`);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, "invalid-template");

  const template = success(inspect(source));
  assert.equal(template.inputs[0].default.raw, file);
  for (const value of [remote, file]) {
    const bound = success(
      template.bind([{ key: "asset", kind: "image-reference", value }]),
    );
    assert.equal(success(inspect(bound.svg)).inputs[0].default.raw, value);
  }
  assert.deepEqual(calls, []);
});

test("object property names bind as ordinary keys and XML values stay literal", () => {
  const source = svg(
    '<text data-svt-text="__proto__">old</text><g data-svt-fill="constructor"/><image data-svt-image="toString"/>',
  );
  const template = success(inspect(source));
  const output = success(
    template.bind([
      { key: "__proto__", kind: "text", value: "<title>A &amp; B</title>" },
      { key: "constructor", kind: "paint", value: 'a" b="c' },
      { key: "toString", kind: "image-reference", value: "art.svg?a=1&b=2" },
    ]),
  );
  const expected = svg(
    '<text data-svt-text="__proto__">&lt;title&gt;A &amp;amp; B&lt;/title&gt;</text>' +
      '<g data-svt-fill="constructor" fill="a&quot; b=&quot;c"/>' +
      '<image data-svt-image="toString" href="art.svg?a=1&amp;b=2"/>',
  );
  assert.deepEqual(semantics(output.svg), semantics(expected));
  assert.deepEqual(
    semantics(success(template.bind([])).svg),
    semantics(source),
  );
});

test("image-content media types reject parameters, delimiters, and non-image types", () => {
  const template = success(inspect(svg('<image data-svt-image="a"/>')));
  for (const mediaType of [
    "image/svg+xml;charset=utf-8",
    "image/png;base64",
    "image/png,extra",
    'image/p"ng',
    "text/html",
  ]) {
    const result = template.bind([
      {
        key: "a",
        kind: "image-content",
        mediaType,
        bytes: new Uint8Array([1]),
      },
    ]);
    assert.equal(result.ok, false, mediaType);
    assert.equal(result.error.code, "invalid-binding", mediaType);
  }
});
