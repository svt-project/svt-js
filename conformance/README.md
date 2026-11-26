# Accepted conformance assets

These files are explicitly copied from the stable specification edition identified in
[SNAPSHOT.json](SNAPSHOT.json). [manifest.json](manifest.json) verifies the canonical data and license
files. This guide and the snapshot stamp are implementation-owned; the canonical files remain
byte-identical to their source.

The authoritative [fixture convention](https://github.com/svt-project/svt-spec/blob/8682a284a87669a744753be80d8a0277ac90dc39/conformance/README.md)
defines expected observations. [Implementation validation](../docs/conformance.md) describes how
our runner projects the TypeScript API and compares XML. Inspection and substitution are active;
optional interpretation cases and named colors are retained but not executed.

Do not fetch live assets during a build, edit expected data to match this implementation, or change
its recorded origin. Adoption of a new snapshot requires an explicit source,
manifest and behavior review. Preserve the [MIT license](LICENSE).
