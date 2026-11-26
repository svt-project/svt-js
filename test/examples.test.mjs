import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { inspect } from "../dist/index.js";
import { createPreviewController } from "../examples/live-preview/controller.js";

function harness(t, timeoutMs = 5000) {
  const workers = [],
    results = [],
    errors = [];
  const controller = createPreviewController({
    source: "template XML",
    timeoutMs,
    createWorker() {
      const worker = {
        messages: [],
        terminated: false,
        postMessage(message) {
          this.messages.push(message);
        },
        terminate() {
          this.terminated = true;
        },
        reply(id, ok = true) {
          this.onmessage({ data: { id, ok, svg: "output" } });
        },
      };
      workers.push(worker);
      return worker;
    },
    onResult: (result) => results.push(result),
    onError: (error) => errors.push(error),
  });
  t.after(() => controller.dispose());
  return { controller, workers, results, errors };
}
const values = (value) => [{ key: "heading", kind: "text", value }];

test("example coalesces pending state and suppresses stale output", (t) => {
  const { controller, workers, results } = harness(t);
  controller.update(values("first"));
  controller.update(values("discarded"));
  controller.update(values("latest"));
  assert.equal(workers[0].messages.length, 1);
  workers[0].reply(1);
  assert.deepEqual(results, []);
  assert.equal(workers[0].messages.length, 2);
  assert.equal(workers[0].messages[1].bindings[0].value, "latest");
  assert.equal(workers[0].messages[1].source, undefined);
  workers[0].reply(3);
  assert.equal(results[0].id, 3);
});

test("example captures a complete update at submission", (t) => {
  const { controller, workers } = harness(t);
  controller.update(values("active"));
  const next = values("captured");
  controller.update(next);
  next[0].value = "mutated";
  workers[0].reply(1);
  assert.equal(workers[0].messages[1].bindings[0].value, "captured");
});

test("example cancellation terminates active work, clears pending state and reloads", (t) => {
  const { controller, workers, results } = harness(t);
  controller.update(values("active"));
  const oldReply = workers[0].onmessage;
  controller.update(values("pending"));
  controller.cancel();
  assert.equal(workers[0].terminated, true);
  controller.update(values("resumed"));
  assert.equal(workers.length, 2);
  assert.equal(workers[1].messages[0].source, "template XML");
  oldReply({ data: { id: 1, ok: true, svg: "stale" } });
  assert.deepEqual(results, []);
  workers[1].reply(workers[1].messages[0].id);
  assert.equal(results.length, 1);
});

test("example deadline terminates a stuck Worker and admits a later update", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { controller, workers, errors } = harness(t, 10);
  controller.update(values("stuck"));
  t.mock.timers.tick(10);
  assert.equal(workers[0].terminated, true);
  assert.equal(errors[0].kind, "timeout");
  controller.update(values("retry"));
  assert.equal(workers[1].messages[0].source, "template XML");
});

test("example reloads after a rejected initial inspection", (t) => {
  const { controller, workers, results } = harness(t);
  controller.update([]);
  workers[0].reply(1, false);
  assert.equal(results[0].ok, false);
  controller.update([]);
  assert.equal(workers[1].messages[0].source, "template XML");
});

test("Worker failure discards stale work and reloads only the newest pending state", (t) => {
  const { controller, workers, results, errors } = harness(t);
  controller.update(values("active"));
  controller.update(values("discarded"));
  controller.update(values("latest"));
  let prevented = false;
  workers[0].onerror({
    message: "failed",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(workers[0].terminated, true);
  assert.deepEqual(errors, []);
  assert.deepEqual(results, []);
  assert.equal(workers[1].messages[0].source, "template XML");
  assert.equal(workers[1].messages[0].bindings[0].value, "latest");
  assert.equal(workers[1].messages.length, 1);
  const latest = workers[1].messages[0].id;
  workers[1].reply(latest);
  assert.deepEqual(
    results.map((result) => result.id),
    [latest],
  );
  assert.equal(workers[1].messages.length, 1);
});

test("Worker response transfer failure is a host error and permits retry", (t) => {
  const { controller, workers, results, errors } = harness(t);
  controller.update([]);
  workers[0].onmessageerror();
  assert.equal(workers[0].terminated, true);
  assert.equal(errors[0].kind, "worker");
  assert.equal(errors.length, 1);
  assert.deepEqual(results, []);
  controller.update(values("retry"));
  const retry = workers[1].messages[0];
  assert.equal(retry.source, "template XML");
  assert.deepEqual(retry.bindings, values("retry"));
  workers[1].reply(retry.id);
  assert.deepEqual(
    results.map((result) => result.id),
    [retry.id],
  );
  assert.equal(errors.length, 1);
});

test("example disposal releases the Worker and refuses further updates", (t) => {
  const { controller, workers } = harness(t);
  controller.update([]);
  controller.dispose();
  assert.equal(workers[0].terminated, true);
  assert.throws(() => controller.update([]), /disposed/);
});

test("Node example embeds the image and updates shared heading and paint targets", () => {
  const output = "artifacts/examples/test-invitation.svg";
  execFileSync(process.execPath, ["examples/node/bind.mjs", output]);
  const result = inspect(readFileSync(output));
  assert.equal(result.ok, true);
  const byKey = Object.fromEntries(
    result.value.inputs.map((input) => [input.key, input]),
  );
  assert.deepEqual(
    byKey.heading.targets.map((target) => target.elementName),
    ["title", "text"],
  );
  assert.equal(byKey.heading.default.raw, "Trail photography");
  assert.equal(byKey.accent.targets.length, 2);
  assert.equal(byKey.accent.default.raw, "#336699");
  assert.match(byKey.artwork.default.raw, /^data:image\/svg\+xml;base64,/);
});
