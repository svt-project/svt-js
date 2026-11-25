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

CI retains the report as the `coverage` artifact. Codecov upload is prepared but runs only when the
repository variable `CODECOV_ENABLED` is `true`. Enable the repository in Codecov and verify the
first report before replacing the README's artifact badge with a live Codecov badge. Uploads use
OIDC for trusted runs and Codecov's public tokenless support for fork PRs, matching the .NET project.
