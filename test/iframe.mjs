import { inspect } from "../dist/index.js";
import { equal, success, svg } from "./support.mjs";

export function checkIframeBytes() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  try {
    const { Uint8Array: FrameBytes } = frame.contentWindow;
    const source = svg('<image data-svt-image="photo" href="original.png"/>');
    const xml = new FrameBytes(new TextEncoder().encode(source));
    equal(xml instanceof Uint8Array, false);
    equal(success(inspect(xml)).inputs[0].default.raw, "original.png");

    const image = new FrameBytes([99, 0, 1, 255, 99]).subarray(1, 4);
    const bound = success(
      success(inspect(source)).bind([
        {
          key: "photo",
          kind: "image-content",
          mediaType: "image/png",
          bytes: image,
        },
      ]),
    );
    equal(
      success(inspect(bound.svg)).inputs[0].default.raw,
      "data:image/png;base64,AAH/",
    );
  } finally {
    frame.remove();
  }
}
