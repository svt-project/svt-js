# Security

SVT performs literal substitution in supplied SVG. It does not render, execute, fetch, or sanitize
artwork. Hosts own trust decisions, reference schemes, preview isolation, and workload concurrency.

[Resource limits](docs/resource-policy.md) constrain admission and retained work. DOM complexity
checks occur after parsing; output size is checked after serialization. These are not hard limits
on peak memory or execution time. Use host deadlines and isolation for untrusted workloads.

For a suspected vulnerability, use [GitHub private reporting](https://github.com/svt-project/svt-js/security/advisories/new)
when available. Otherwise, open an issue requesting a private contact without exploit details or
sensitive inputs. Keep dependency-audit and implementation-review evidence separate: a clean
`npm audit` is not a security assessment.

Release-readiness work is tracked in the [coordinator](https://github.com/svt-project/.github/issues/8).
