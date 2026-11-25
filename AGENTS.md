# Agent guidance

- Use American English. Work serially; request approval before delegating.
- Check Git status and preserve unrelated changes. Default branch: master.
- This public prerelease implementation uses the accepted design in docs/api.md and
  docs/resource-policy.md. No compatibility shims or legacy format readers.
- Keep synchronous inspection/binding independent of the host, Worker lifecycle and rendering.
  Keep xmldom and mutable DOM types private. Reject whole operations; do not add scoped recovery.
- Discuss changes to public API, dependencies, format or ownership before implementation.
- Keep specification rules authoritative in svt-spec. Adopt stamped copies explicitly;
  do not fetch live canonical assets during builds. Optional interpretation is separate.
- Preserve MIT licensing, Bathos attribution and dependency notices.
- Preserve strict TypeScript analysis, including dependency declarations. Narrow external values;
  never suppress errors just to obtain a build. Test input and ownership boundaries.
- Run npm run check after changes; use npm run test:browser for relevant runtime changes.
  Validate documentation and review staged files for private data before committing.
- Keep machine paths, IDE state, credentials, consumer-specific material and generated evidence out
  of commits. Local handoff notes belong in ignored .local/. Do not publish npm packages or tags
  without explicit authorization. Package private stays true until distribution is agreed.
- GitHub coordinator issue svt-project/.github#8 owns delivery tracking; docs describe current code.
