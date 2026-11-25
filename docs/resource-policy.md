# Resource policy

These are configurable per operation, not format constraints or portable fixture settings. Validate
finite positive safe integers and take an immutable copy at entry; no global mutable configuration.
Defaults provide headroom for multi-megabyte SVG documents; they are not performance guarantees.

| Option                               |                      Default | Enforcement                                                                                                                            |
| ------------------------------------ | ---------------------------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Inspection `maxSourceBytes`          |                       20 MiB | Before copying/decoding byte input; decoded-string input has no underlying byte length.                                                |
| Inspection `maxSourceCharacters`     | 20,971,520 UTF-16 code units | Before parsing either input form.                                                                                                      |
| Inspection `maxNodes`                |                      200,000 | Count parsed DOM nodes, including text/comments/PIs, before retaining the template or cloning it. Post-parse, not an allocation bound. |
| Inspection `maxDepth`                |                  64 elements | Check parsed element depth before retention/cloning. Root depth is 1. Post-parse.                                                      |
| Inspection `maxAttributesPerElement` |                          128 | Include namespace declarations. Post-parse.                                                                                            |
| Inspection `maxTargets`              |                       50,000 | Bound discovered targets and inventory construction.                                                                                   |
| Binding `maxBindings`                |                       10,000 | Before capturing the assignment array.                                                                                                 |
| Binding `maxValueCharacters`         | 10,485,760 UTF-16 code units | Per key or raw string payload before mutation.                                                                                         |
| Binding `maxTotalValueCharacters`    | 41,943,040 UTF-16 code units | Sum submitted keys and string payloads before mutation.                                                                                |
| Binding `maxImageBytes`              |                       20 MiB | Per supplied encoded image, before copying or base64 encoding.                                                                         |
| Binding `maxTotalImageBytes`         |                       40 MiB | Count per assignment, including reused byte buffers.                                                                                   |
| Binding `maxMediaTypeCharacters`     |        256 UTF-16 code units | Before media-type grammar checks/normalization.                                                                                        |
| Binding `maxOutputBytes`             |                 80 MiB UTF-8 | Preflight known repeated replacement/escaping/base64 growth; exact final check before exposing output.                                 |

Equality is allowed. Hosts can raise limits explicitly. There is no unlimited sentinel. Values above
ordinary runtime constraints need not be achievable. Limits apply to one operation; a host controls
retained templates, request concurrency, queues and overall workload.

Before cloning/binding, bound known replacement expansion using target multiplicity, XML escaping
and base64 length. Reject if the mandatory emitted replacement content alone exceeds output capacity.
This prevents an obvious repeated-replacement amplification path without implementing another XML
serializer. This preflight is not a full serialized-document size calculation: unchanged content,
namespace serialization and final encoding still contribute. Check the actual UTF-8 size before
returning BoundSvg and before allocating its exported byte array. Do not promise a bounded writer;
xmldom creates an output string before that final check.

Source admission caps constrain what we pass to the DOM parser. DOM depth/node/attribute limits are
necessarily checked after the parser allocates its tree. They control subsequent work and retained
state; they do not bound parser peak memory. Template clones and encoding create additional
allocations. The spike's seven resource probes do not establish protection against arbitrary DoS.

Host-owned Worker termination and isolation are described in [the API policy](api.md#execution-and-cancellation).
