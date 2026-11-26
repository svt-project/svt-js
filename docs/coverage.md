# Coverage

```sh
npm run coverage
```

Node's [test coverage reporter](https://nodejs.org/docs/latest-v24.x/api/test.html#collecting-code-coverage)
uses the build's source maps to report TypeScript lines, branches, and functions. The output is
`artifacts/coverage/lcov.info` and `summary.json`. The gate rejects missing executable modules or
empty metrics. `src/model.ts` contains only type declarations and is excluded.

Coverage includes Node conformance and policy tests. Host-example tests also run, but examples,
fixtures, and dependencies are excluded from library metrics. Browser Worker checks are separate;
the report does not claim browser coverage or security assurance. Percentages are informational,
not a target for adding low-value tests.

CI retains the Node 24 report as the `coverage` artifact. With the repository variable
`CODECOV_ENABLED=true`, CI uploads its LCOV file under the `node` flag. Codecov reports project
and patch coverage as informational checks. The README badge shows
[Codecov coverage on `master`](https://app.codecov.io/gh/svt-project/svt-js/tree/master).

Trusted runs authenticate with GitHub OIDC. Fork pull requests use Codecov's public tokenless upload.
