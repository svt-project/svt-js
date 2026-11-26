# Conformance and validation

This implementation accepts template format `1.0` and implements the inspection and substitution
profiles. Cases exercise input discovery, per-target defaults and substitution, including repeated
text, image, and paint keys. Optional authored paint/image interpretation is not implemented; its
reference files are retained without claiming conformance.

[SNAPSHOT.json](../conformance/SNAPSHOT.json) records the explicitly accepted specification revision
and the hash of its complete reference set. Builds use the embedded files from that edition.

The runner compares language-neutral inventory observations and semantic XML output. Python
minidom/Expat independently checks substitution outputs. Tests cover repeated binds, literal text,
UTF-8 boundaries, ownership, metadata, resource limits, and independently generated multi-megabyte
artwork. They do not establish throughput or peak-memory guarantees.

Chromium and Firefox execute the same core and canonical cases in a dedicated Worker. Both browsers also exercise
template and image bytes created by a same-origin iframe. The separate
[integration example](../examples/README.md) checks live updates, coalescing, cancellation, reload,
and preview cleanup in Chromium.

The parser owns XML error reporting. SVT does not add schema validation, renderer property
validation, or sanitization. See [API policy](api.md), [resource limits](resource-policy.md), and
[coverage](coverage.md) for the implemented boundaries and evidence.
