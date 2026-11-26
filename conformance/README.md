# Accepted conformance assets

These files are explicitly copied from the reviewed specification candidate identified in
[SNAPSHOT.json](SNAPSHOT.json). [manifest.json](manifest.json) verifies the canonical data and license
files. This guide and the snapshot stamp are implementation-owned; the canonical files remain
byte-identical to their source.

The authoritative [fixture convention](https://github.com/svt-project/svt-spec/blob/82def4429a4b4e68977928d1040bfd1c11066b8e/conformance/README.md)
defines expected observations. [Implementation validation](../docs/conformance.md) describes how
our runner projects the TypeScript API and compares XML. Inspection and substitution are active;
optional interpretation cases and named colors are retained but not executed.

Do not fetch live assets during a build, edit expected data to match this implementation, or relabel
this snapshot as a published edition. Adoption of a new snapshot requires an explicit source,
manifest and behavior review. Preserve the [MIT license](LICENSE).
