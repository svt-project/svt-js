import test from "node:test";
import assert from "node:assert/strict";
import { Node } from "@xmldom/xmldom";
import { fragmentedText, textPositions } from "./text-binding.mjs";

test(
  "text binding preserves sibling order, empty values, and other hooks",
  textPositions,
);

test("fragmented text binds without repeatedly reindexing the same child list", (t) => {
  // xmldom rebuilds the parent's live child list on removal. Count the entries
  // subject to that work so this regression test needs no stopwatch.
  const remove = Node.prototype.removeChild;
  let entries = 0;
  t.mock.method(Node.prototype, "removeChild", function (child) {
    entries += this.childNodes.length;
    return remove.call(this, child);
  });
  const fragments = 12;
  fragmentedText(fragments);
  assert.ok(
    entries <= fragments * 3,
    "expected at most one pass over the target's children",
  );
});
