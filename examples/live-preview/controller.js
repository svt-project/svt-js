// Host scheduling example, not an export of @svt-project/svt-js.
export function createPreviewController({
  source,
  createWorker,
  onResult,
  onError,
  timeoutMs = 5000,
}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new RangeError("timeoutMs must be positive.");
  let worker, active, pending, timer;
  let revision = 0;
  let disposed = false;

  function stop() {
    clearTimeout(timer);
    if (worker) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    }
    worker = active = undefined;
  }

  function fail(kind, message) {
    const current = active?.id === revision;
    stop();
    try {
      if (current) onError({ kind, message });
    } finally {
      pump();
    }
  }

  function pump() {
    if (disposed || active || !pending) return;
    active = pending;
    pending = undefined;
    const fresh = !worker;
    try {
      if (fresh) {
        worker = createWorker();
        const owner = worker;
        worker.onmessage = ({ data }) => {
          if (worker !== owner || !active || data.id !== active.id) return;
          clearTimeout(timer);
          active = undefined;
          if (!data.ok) stop(); // A rejected initial inspection must be retried from source.
          try {
            if (data.id === revision) onResult(data);
          } finally {
            pump();
          }
        };
        worker.onerror = (event) => {
          event.preventDefault();
          if (worker === owner) fail("worker", event.message);
        };
        worker.onmessageerror = () => {
          if (worker === owner)
            fail("worker", "Could not read the Worker response.");
        };
      }
      timer = setTimeout(
        () => fail("timeout", "Preview exceeded its time budget."),
        timeoutMs,
      );
      worker.postMessage({ ...active, ...(fresh ? { source } : {}) });
    } catch (error) {
      // Worker construction or structured cloning can fail before any library call.
      fail("worker", String(error));
    }
  }

  function cancel() {
    revision++;
    pending = undefined;
    stop();
  }

  return {
    update(bindings) {
      if (disposed) throw new Error("Preview controller is disposed.");
      const snapshot = structuredClone(bindings);
      pending = { id: ++revision, bindings: snapshot };
      pump();
    },
    cancel,
    dispose() {
      cancel();
      disposed = true;
    },
  };
}
