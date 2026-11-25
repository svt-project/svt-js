# Host integration

`inspect` and `bind` are synchronous. Use a dedicated Worker when large templates would block an
interactive page. The [runnable preview](../examples/README.md#browser-live-updates-in-a-worker)
shows the complete flow.

## Keep the template in the Worker

Send XML and plain binding records to the Worker. Inspect once, retain the `Template` there, and
send back inventory data or `result.value.svg`. `Template.bind` and `BoundSvg.toUtf8` are methods;
do not post those objects or DOM nodes through `postMessage`.

The example caches one template. If your host changes the source, dispose the controller and create
one for the new source. Image byte views can be cloned or transferred, but transferring detaches the
host buffer; choose ownership explicitly. The example clones submitted state to avoid later edits
changing queued work.

## Coalesce complete states

Allow one operation in flight and one pending update. Replace the pending update on every edit,
then run it when the active operation finishes. Compare request IDs before displaying a result so
older work cannot overwrite newer edits.

Each queued update must contain all current overrides. Bindings are not patches: a new bind starts
from the original template. Omit a key to restore its authored value; submit an empty string to clear it.

## Cancel by terminating

A busy synchronous parser cannot handle a queued cancellation message. Terminate its Worker to
stop active work; discard pending updates and ignore any old response. Reload the source into a
fresh Worker on the next request. An `AbortSignal` on a wrapper alone cannot interrupt `bind`.

The example's deadline covers Worker startup, inspection, and binding. It reports a host timeout,
not an SVT parse error. Worker errors and message-transfer errors also reset the Worker. Dispose the
controller when the view is removed. For hostile server workloads, use process isolation and host
memory/concurrency limits; Worker termination is not a hard memory cap.

## Render as an image

The demo creates an `image/svg+xml` Blob URL and assigns it to an `<img>`. It revokes the previous
URL on replacement and the final URL on disposal. It never inserts SVG through `innerHTML`.

SVT preserves authored artwork, including content your renderer may interpret as active or external.
Choose trusted sources or a separate sanitization/isolation policy, and restrict reference schemes
and resource loading in the host. Literal text escaping does not make an arbitrary template safe.
See [resource limits](resource-policy.md) for the core's admission boundaries.
