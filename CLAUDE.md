# Supaplex Clone

A from-scratch clone of the classic puzzle game Supaplex. TypeScript + Webpack + Canvas2D,
no frameworks. Public MIT-licensed GitHub repo at
[VictorZakharov/supaplex-sonnet5](https://github.com/VictorZakharov/supaplex-sonnet5) (`origin`,
branch `master`), live at **https://victorzakharov.github.io/supaplex-sonnet5/**. Changes land via
branch + PR (left open for the user to merge), never direct pushes to `master`; use `gh` for all
GitHub operations, including repo settings.

## Commands

- `npm start` — webpack-dev-server on **port 8080**, hot reload.
- `npm run build` — production bundle to `dist/`.
- `npx tsc --noEmit` — typecheck (also what `npm run typecheck` runs).
- No automated test suite exists. Verification is: typecheck + production build + manual/Playwright
  browser testing against the dev server.
- Windows quirk: if port 8080 is already bound from a previous session, find and kill it first:
  `netstat -ano | grep ":8080" | grep LISTENING | awk '{print $5}'` then `taskkill //F //PID <pid>`.

## Deployment (GitHub Pages)

Four workflows in `.github/workflows/`, chained deliberately:

- `build.yml` — typecheck + build, required check on every PR. Uses dorny/paths-filter to skip the
  expensive steps on docs-only changes *instead of* `paths-ignore` on the trigger, so the required
  check still reports (a `paths-ignore`d required check would leave docs PRs unmergeable).
- `deploy.yml` — on master push, builds and commits `dist/` to the `gh-pages` branch root
  (JamesIves action, `clean-exclude: pr-preview`).
- `pr-preview.yml` — on PR open/sync/close, deploys to `gh-pages`/`pr-preview/pr-N/` and posts a
  sticky comment link (rossjrw action; removes the folder when the PR closes — a merged PR's
  preview 404ing is correct, not a bug).
- `pages.yml` — the actual publisher: `workflow_run` on Deploy/PR-preview completion (plus manual
  `workflow_dispatch`) checks out the whole `gh-pages` tree and deploys it via
  `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Why the indirection exists:** the repo's Pages `build_type` is `workflow`, NOT the default legacy
branch-serving mode — the legacy Jekyll pipeline wedged permanently (internal deploy job polling an
empty status forever) after the repo flipped private→public, and switching to Actions-native
publishing was the fix. Don't "simplify" by reverting to branch-based Pages serving, and don't make
`pages.yml` trigger `on: push` to `gh-pages` (push-event workflows run from the pushed branch's own
tree, which the deploy actions wipe — `workflow_run` runs from `master`'s copy, which is the point).
Two timing quirks: the preview bot comment's link 404s for ~30–60s until the chained Publish Pages
run finishes; and `pages.yml`'s concurrency is queue-not-cancel because a PR merge fires Deploy and
PR-preview cleanup back-to-back and cancelling mid-deploy surfaces as an errored deployment.

## Architecture

- **Tick-based physics**, not per-frame: `src/engine/PhysicsEngine.ts` runs a fixed ~140ms
  (`TICK_MS`) simulation step, in strict order: Murphy's action → falling/rolling objects →
  enemies (Snik-Snak, Electron) → Zonk generators → bombs → `CollisionResolver`. Rendering
  (`src/render/Renderer.ts`) runs every `requestAnimationFrame` and interpolates positions
  between the last two ticks — don't conflate tick rate with render rate.
- **Grid cells split terrain vs. occupant** (`src/engine/Cell.ts`): terrain is static
  (Wall/Base/Port/Exit/...), occupant is the dynamic thing sitting on it (Murphy/Zonk/Infotron/...).
  A Bug's Electron orbits *around* it on separate empty cells — never conflate the two.
- **Levels** (`src/level/levels.ts`) are hand-authored via `LevelCanvas` (index-based `set`/`hline`/
  `vline` — not raw ASCII strings, to avoid manual character-counting bugs). 6 levels: 5 teach one
  new theme each, the 6th ("Finale") combines every mechanic into a hub-plus-four-branch-rooms
  layout where the rooms can be tackled in any order. `src/ui/hints.ts` has a parallel per-level
  list of "what's new" text shown in the in-game side panel — keep it in sync when adding mechanics.
- **Full mechanics, not a simplified subset.** Zonk Generators and Timer Bombs are intentionally
  included even though the original 1991 Supaplex didn't have them — this was an explicit scope
  decision, not a mistake. Don't "fix" them away.
- **Two distinct bomb types** (`src/entities/bomb.ts`): impact bombs (type `"bomb"`, drawn as a
  square 3.5" floppy disk) are pushable/fallable but square-shaped so they never roll, and explode
  the instant they collide with anything (land, or get landed on) — otherwise permanently inert.
  Timed bombs (type `"timedBomb"`) are planted from a limited per-level `bombSupply` via Space +
  direction (see below), and carry their own countdown `fuseTicks`. Both chain-react off a nearby
  explosion via `explodeBomb`'s recursive blast-radius scan.
- **Space + direction acts on the adjacent cell without moving Murphy there** (`resolveMurphyLook`
  in `murphyActions.ts`): collects a supported Infotron, clears a Base tile, or plants a timed bomb
  — whichever applies, instantly, no charge-up delay. This is the *only* way to plant a timed bomb;
  there is no "hold Space alone" charging mechanic. `PhysicsEngine.tick` branches on
  `spaceHeld && intent !== null` to call it instead of normal movement.
- **Roundness is a property of the object, not just the surface.** `isOccupantRounded` in
  `TileProps.ts` gates rolling from *both* sides: a falling object only rolls off a rounded surface
  if the object itself is round-shaped (Zonk/Infotron/OrangeDisk). Bombs are square — they never
  roll, they just rest flush even on a rounded Wall, and only fall/explode straight down. `WallSquare`
  terrain (flat-edged, doesn't roll anything off it, even from a 1-cell pedestal) exists alongside
  round `Wall` for the same reason, giving level design a way to safely rest things on a 1-wide
  pedestal without the 3-wide-platform workaround in gotcha #1.

## Hard-won gotchas (each of these caused a real shipped bug)

1. **Walls (and Hardware) are "rounded" surfaces.** A Zonk/Infotron/Bomb resting on a single-cell
   pedestal will roll off the edge and fall to the floor, because both diagonals are open. Static
   resting objects need a **3+-cell-wide platform** underneath, not a 1-cell pedestal.
2. **One-way gates (Port / Gravity Port) are irreversible.** `murphyActions.ts` teleports Murphy
   past the port cell to the far side — there is no walking back through against the configured
   direction. When designing a level, never place a required pickup where the only way to it is
   *behind* a one-way gate relative to some other required pickup — always verify by tracing the
   full critical path, not just "does this room have the item in it."
3. **Enemies spawn directly via the level legend — they bypass needing a walk-in path.** It's easy
   to build a Snik-Snak "loop" room that's a fully sealed rectangle with no doorway for *Murphy*,
   because the Snik-Snak itself doesn't need one. Always double check enemy rooms have an actual
   gap in the walls.
4. **Level completability should be verified programmatically, not just by eyeballing screenshots.**
   A BFS flood-fill from Murphy's start over walkable terrain (Empty/Base/Port/Exit), checked
   against every placed Infotron's position, catches "unreachable pickup" bugs immediately. This
   is done via temporary debug methods on `Game` (`debugReachability()`, `debugDumpGrid()`,
   `debugLoadLevel()`, `debugTick()`, `debugState()`) exposed on `window.__game` — worth re-adding
   temporarily any time levels change, then removing again.
   - **Also add `debugFreeze(frozen)`/have `debugLoadLevel` auto-freeze.** The game's own
     `requestAnimationFrame` loop keeps calling `updatePlaying` with real wall-clock `dt` between
     separate Playwright round-trips (and can even sneak a tick in between a synchronous debug
     call returning and its result being serialized) — without freezing it, manual `debugTick`
     calls get silently interleaved with extra automatic ticks, producing flaky, irreproducible
     test results that look like game bugs but are just automatic-loop contamination
     (`debugFreeze(true)` makes `loop()` skip `updatePlaying` while `debugTick` still calls
     `physics.tick` directly, unaffected).
   - **Debug snapshot methods must return deep-copied plain data, never live object/array
     references.** `debugState()` returning `{ occupants: grid.allOccupants() }` directly held
     mutable references that could show a *later* mutated value by the time Playwright finished
     serializing the result, causing results to look wrong even when the underlying tick logic was
     correct. Use `JSON.parse(JSON.stringify(...))` (or an equivalent deep copy) for any debug
     snapshot.
   - **`debugSetTerrain`/`debugSpawnZonk` (for constructing synthetic test fixtures) must target a
     column/area with nothing else nearby.** Carving terrain near an *existing* level feature can
     silently break that feature's support (e.g. widening a hole under a real level's Infotron
     platform), sending it rolling into your test shaft and producing confusing, unrelated results
     that look like a bug in the mechanic under test. Pick an empty corner of the level, or check
     `debugDumpGrid()` first for what's already there.
5. **When a level design depends on two moving things intersecting at a specific tick (a falling
   object landing on a moving enemy), same-direction motion never reliably converges — opposite
   directions do.** If both move at the same speed in the same direction through their shared
   cells, the timing only works for one exact phase out of the whole cycle (see Level 4's Electron
   ring vs. a dropped Zonk: the ring column shared with the drop path needs the Electron traveling
   *toward* the falling Zonk, not parallel to it — `stepElectron`'s ring-index direction, currently
   counterclockwise, encodes this. Flipping it back would silently reintroduce the near-impossible
   timing window).
6. **A fall/roll/push/patrol/port-landing/generator-drop cell must be literal `Empty` terrain, not
   `Base`.** `isOpenForPush`, `isOpenTarget` (falling), `isOpenForPlant`, and the Port/GravityPort
   exit-cell check all require terrain `=== Empty` specifically — Base blocks all of them exactly
   like a Wall would, it's just diggable first. Since most levels now default-fill to Base (dirt)
   for a faithful "mostly diggable ground" look, any level edit that touches a push lane, a roll
   landing, a fall shaft, an enemy patrol ring, a Zonk Generator's spawn-drop cell, or a Port's
   landing cell must explicitly carve those specific cells back to `" "` (Empty) — see the carve-out
   blocks at the top of each `levelN()` function in `levels.ts`.
7. **A "technically reachable" fall path can still be a deterministic death trap.** A Zonk dropped
   from height down a long, unobstructed shaft that lands exactly on the player's natural walking
   corridor will land at a fixed tick count — if that happens to line up with roughly how long a
   fast, efficient walk from spawn takes to reach that column, *every* efficient playthrough dies
   there, every time (not bad luck — deterministic). Keep incidental "falls from height" demo shafts
   short enough to land (and rest) well clear of any tick count a real player could plausibly reach
   that column by, not just "does a reachability BFS say the level is still completable."
8. **Canvas HiDPI**: backing store is `CANVAS_WIDTH/HEIGHT * devicePixelRatio`, CSS size stays
   logical, `ctx.scale(dpr, dpr)` is applied once in `Game`'s constructor. Everything downstream
   draws in logical units — never read `ctx.canvas.width/height` directly (that's the physical
   scaled size); use the `CANVAS_WIDTH`/`CANVAS_HEIGHT` constants. Do not reintroduce
   `image-rendering: pixelated` on the canvas — this project draws smooth vector shapes, not pixel
   art, and that CSS property blurs/blocks text badly.
9. **Input latching**: `InputController.consumeIntent()` latches every fresh keydown into a
   one-shot `pendingIntent` so a tap shorter than one tick is never dropped between simulation
   samples, and only *non-repeat* keydowns update tracked direction (so OS key-auto-repeat on a
   held key can't race with / override a newly-pressed second direction). Don't revert to naively
   peeking at "currently held key" state — that's what caused the original "keys feel stuck" bug.
10. **A falling object is only lethal to Murphy while it's actually in motion.** `ZonkOccupant`/
    `InfotronOccupant` carry `wasFalling` (set in `Grid.beginTick()` from the *previous* tick's
    `movementKind`, before it gets reset to `"idle"`). If Murphy digs the exact tile supporting a
    resting rock and steps into that spot, the rock discovers it's unsupported the same tick — but
    since it was resting (`wasFalling === false`), landing on Murphy that tick does **not** kill
    him; it's simply blocked like solid ground (falls through to the roll check, or just sits put)
    until a later tick when it's genuinely mid-fall. Bombs are the one exception — they're always
    primed and detonate on any collision regardless of `wasFalling`, moving or not. Don't gate the
    bomb branch on `wasFalling` too; that's a deliberate, separate design (bombs have no momentum
    requirement, only rocks do).
11. **In a dirt-default level, *every* cell along a push/roll/fall path needs an explicit Empty
    carve — including intermediate resting cells, not just the final landing spot.** Forgetting
    to carve the cell a pushed object is supposed to land on (as opposed to the cell it eventually
    rolls/falls into afterward) makes the push silently fail against Base terrain (`isOpenForPush`
    requires exactly `Empty`) with no error — the object just doesn't move. When a push/roll demo
    "does nothing," check every cell along its path was carved, not just the start and end.
12. **Destroying a Bug's Electron via `destroyElectron()` bursts it like a small bomb**: every Base
    tile in its blast radius becomes a fresh Infotron (via `createInfotron`), which then falls
    naturally under normal gravity — no special-casing needed beyond spawning it. These bonus
    Infotrons are *not* counted in `infotronsRequired` (that's fixed at level-parse time from the
    level's authored layout), so treat electron-kill Infotrons as optional bonus score, never as
    something a level's completability depends on.
13. **Testing gotcha: `events.anyKey`-driven state transitions (`"dead"` → reload, `"levelComplete"`
    → next level, etc.) are NOT gated by `debugFreeze`.** They live in `Game.loop`'s top-level
    `switch`, outside the `if (!this.debugFrozen)` guard around `updatePlaying`. A stray queued
    keyboard event from earlier in a Playwright session (e.g. a leftover `Enter` press) can silently
    fire one of these transitions on the very next animation frame after a debug-triggered death,
    auto-reloading the level before you can inspect or screenshot the post-death state. If a
    post-death/post-win screenshot looks like a fresh level instead of the expected overlay,
    suspect this before doubting the mechanic — verify via `debugState()` immediately after the
    tick that caused it, not via a screenshot taken any time later.
