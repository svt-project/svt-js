# Security

SVT performs literal substitution in supplied SVG. It does not render, execute, fetch, or sanitize
artwork. Hosts own trust decisions, reference schemes, preview isolation, and workload concurrency.

[Resource limits](docs/resource-policy.md) constrain admission and retained work. DOM complexity
checks occur after parsing; output size is checked after serialization. These are not hard limits
on peak memory or execution time. Use host deadlines and isolation for untrusted workloads.

Report suspected vulnerabilities through [GitHub private reporting](https://github.com/svt-project/svt-js/security/advisories/new).
Bathos Pty Ltd is the initial security contact. The project maintainer handles reports through GitHub.
Keep exploit details and sensitive inputs out of public issues. A clean
`npm audit` is not a security assessment.

Release-readiness work is tracked in the [coordinator](https://github.com/svt-project/.github/issues/8).
