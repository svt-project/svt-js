# Conformance and validation

This implementation accepts template format `1.0` and implements the inspection and substitution
profiles: 14 canonical inspection cases and seven substitution cases. Optional authored paint/image
interpretation is not implemented; its reference files are retained without claiming conformance.

[SNAPSHOT.json](../conformance/SNAPSHOT.json) records the explicitly accepted specification revision
and the hash of the complete 59-file reference set. That revision came from the now-merged
[conforming-input review](https://github.com/svt-project/svt-spec/pull/2); its candidate edition remains
unpublished. Builds use the embedded files and never fetch live specification assets.

The runner compares language-neutral inventory observations and semantic XML output. Python
minidom/Expat independently checks substitution outputs. Tests cover repeated binds, literal text,
UTF-8 boundaries, ownership, metadata, resource limits, and independently generated multi-megabyte
artwork. They do not establish throughput or peak-memory guarantees.

Chromium executes the same core and canonical cases in a dedicated Worker. The separate
[integration example](../examples/README.md) checks live updates, coalescing, cancellation, reload,
and preview cleanup. Other browser engines remain release-readiness work.

The parser owns XML error reporting. SVT does not add schema validation, renderer property
validation, or sanitization. See [API policy](api.md), [resource limits](resource-policy.md), and
[coverage](coverage.md) for the implemented boundaries and evidence.
