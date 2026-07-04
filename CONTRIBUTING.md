# Contributing

## Setup

```bash
npm install
npm start   # webpack-dev-server on http://localhost:8080, hot reload
```

## Verification

There's no automated test suite. Before opening a PR, verify your change with:

1. `npx tsc --noEmit` (also `npm run typecheck`) — strict TypeScript must compile clean.
2. `npm run build` — production bundle must emit to `dist/` without errors.
3. Manual or Playwright browser testing against the dev server — actually play the
   affected level(s) and confirm the change works, rather than reasoning about the code
   alone. For puzzle-level changes, also check the level is still completable (see the
   reachability/timing notes in `CLAUDE.md`'s "Hard-won gotchas" section) — a level can
   pass a visual read and still contain an unreachable pickup or a deterministic death
   trap.

CI (`.github/workflows/build.yml`) runs the typecheck + build on every PR as a required
check, but it doesn't replace actually playing the change.

## Architecture

Read [CLAUDE.md](CLAUDE.md) first for anything touching the physics engine or level
authoring — it documents the tick pipeline, the terrain/occupant grid model, and a list
of specific bugs that have already been hit once (and the fix that prevents them from
recurring). If you touch a mechanic or add a level, keep it and `src/ui/hints.ts` in
sync.

## Pull requests

Keep PRs scoped to one change. Describe what you tested (typecheck/build/manual play),
not just what you changed.
