import { inspect } from "@svt-project/svt-js";

let template;
self.onmessage = ({ data: { id, source, bindings } }) => {
  if (source !== undefined) {
    const result = inspect(source);
    if (!result.ok) {
      self.postMessage({ id, ok: false, error: result.error });
      return;
    }
    template = result.value;
  }
  if (!template) throw new Error("Load a template before binding.");
  const result = template.bind(bindings);
  // Template.bind and BoundSvg.toUtf8 are functions; send plain data across the boundary.
  self.postMessage(
    result.ok
      ? { id, ok: true, svg: result.value.svg }
      : { id, ok: false, error: result.error },
  );
};
