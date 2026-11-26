# Contributing

Discuss public API, parser dependency, format and ownership changes before implementation. Keep
inspection/binding independent of rendering, resource acquisition and Worker lifecycle. Work
serially unless delegation is explicitly agreed. Use American English.

Use Node 24 and Python 3. Install locked dependencies without lifecycle scripts:

```sh
npm ci --ignore-scripts
npm run format
npm run check
```

The gate checks the stamped conformance inventory, documentation links/formatting, strict TypeScript
including dependency and consumer declarations, canonical observations, implementation-policy
regressions, source-mapped coverage, executable examples, independent Expat output comparisons, and
a packed ESM/declaration consumer. Generated evidence stays under ignored `artifacts/`.

For browser/runtime changes, run a dedicated Worker in Chromium and Firefox:

```sh
npx playwright install chromium firefox
npm run test:browser
npm run test:browser -- firefox
npm run test:examples
```

Set `SVT_CHROME_PATH` to use an existing local Chrome executable for Chromium checks. Firefox
uses a temporary application-data directory and profile. CI runs the Worker suite in both browsers
and the live-preview example in Chromium.

See [coverage](docs/coverage.md) for local reports and Codecov setup. Run `npm audit` before a
release candidate and retain its result alongside the separate implementation security review.
[Coordinator issue #8](https://github.com/svt-project/.github/issues/8) tracks release readiness.

Update [API policy](docs/api.md) and [resource policy](docs/resource-policy.md) with behavior changes.
A source/API declaration check must not conceal errors with `skipLibCheck` or suppressions.
Negative consumer tests may use `@ts-expect-error` to verify prohibited public API usage.
Review public identifiers, fixtures, comments and staged diffs for private references. Preserve
licensing and attribution; never commit credentials, machine paths, IDE state or generated evidence.
Do not publish packages or release tags without explicit authorization.
