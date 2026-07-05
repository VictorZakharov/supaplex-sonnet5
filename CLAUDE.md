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
- `pr-preview.yml` — on PR open/sync/close, deploys to `gh-pages`/`pr-preview/pr-N/` (rossjrw
  action with `comment: false`; removes the folder when the PR closes — a merged PR's preview
  404ing is correct, not a bug). It only posts the sticky PR comment itself on *failure* (build/
  deploy broke) or on close ("preview removed"); the ✅ success comment is deliberately NOT posted
  here, because at this point the preview isn't live yet.
- `pages.yml` — the actual publisher: `workflow_run` on Deploy/PR-preview completion (plus manual
  `workflow_dispatch`) checks out the whole `gh-pages` tree and deploys it via
  `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Why the indirection exists:** the repo's Pages `build_type` is `workflow`, NOT the default legacy
branch-serving mode — the legacy Jekyll pipeline wedged permanently (internal deploy job polling an
empty status forever) after the repo flipped private→public, and switching to Actions-native
publishing was the fix. Don't "simplify" by reverting to branch-based Pages serving, and don't make
`pages.yml` trigger `on: push` to `gh-pages` (push-event workflows run from the pushed branch's own
tree, which the deploy actions wipe — `workflow_run` runs from `master`'s copy, which is the point).
The sticky preview-status PR comment (`<!-- pr-preview-status -->` marker, shared by both
workflows so states overwrite each other) is posted by `pages.yml` *after* `deploy-pages`
succeeds — the one moment the link is guaranteed live — never by `pr-preview.yml` on success,
which finishes ~30–60s before the site actually serves the content (that premature-comment 404
was a real complaint, don't regress it). `pages.yml` resolves the PR number from
`workflow_run.pull_requests[0]` with a head-branch lookup fallback, and skips commenting if the
PR is no longer open. `pages.yml`'s concurrency is queue-not-cancel because a PR merge fires
Deploy and PR-preview cleanup back-to-back and cancelling mid-deploy surfaces as an errored
deployment. On top of that, the publish job (a) **skips itself when a newer publish run is
already queued** — racing two Pages deployments at a merge is what tips the Pages service into
its transient "Deployment failed, try again later" state (every observed failure window started
at a merge), and a queued run ships the same final gh-pages tree anyway — and (b) **retries
`deploy-pages` once in-run after a 120s wait** to ride out short transient windows. In-run
retries are safe (one uploaded artifact); whole-workflow *reruns* are NOT ("Multiple artifacts
named github-pages") — recover from longer outages with fresh `workflow_dispatch` runs instead.

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
  Per-level knobs on `LevelData`: `generatorIntervalTicks` (Finale slows the rain to 60 so the
  crossing under the chute stays open long enough) and `extraInfotronsRequired` (see gotcha 12).
  The Finale's Orange Disk is load-bearing, not a demo: pushed (17,11)→(18,11) it hovers over the
  Zonk Generator's spawn cell — the only object that can, since everything else falls — and shuts
  the rain off; the tray carves at (17/19, 13-14) let landed Zonks roll aside so the row-13
  crossing only seals at the 4th Zonk if the player never plugs it.
- **The start menu is a DOM overlay, not canvas** (`src/ui/StartMenu.ts` + `#start-menu` in
  index.html/styles.css): level cards get real CSS transitions on hover/selection, clicks/hovers
  feed back into `Game.selectedLevelIndex`, and keyboard grid-nav stays in `Game.loop`'s start
  case. Card previews are the real tile drawers rasterized once per level into offscreen canvases
  (`src/ui/levelPreviews.ts`, 2x scale for HiDPI). The gameplay canvas just clears behind it.
- **Full mechanics, not a simplified subset.** Zonk Generators and Timer Bombs are intentionally
  included even though the original 1991 Supaplex didn't have them — this was an explicit scope
  decision, not a mistake. Don't "fix" them away.
- **Enemies never seek Murphy — the only kill is their own patrol step landing on him.** The
  Snik-Snak (`snikSnak.ts`) is a pure wall-hugger (`hugRight`, default left) and fully
  predictable: standing anywhere off its route is safe, adjacency and facing alone never kill.
  Per tick exactly one of: land a wound-up strike (`attacking` — last tick's forward step found
  Murphy in the faced cell; the one-beat dodge window); reverse after a dodge (`reversePatrol`:
  hug side flips + `retreatTurns` two-turn about-face — a dodge-trick or bumping another enemy
  are the ONLY things that ever change the hug side); hug-side turn (`turnedLastTick` blocks two
  in a row, so open ground circles) — fires even with Murphy dead ahead, turning away is
  harmless; wind up instead of stepping when Murphy is the forward cell; step forward; or rotate
  toward an open side (off-side first) when blocked by walls/objects. Turning is always ±90° per
  tick via the continuous `rotation`/`prevRotation` angle the renderer interpolates
  (`isOccupantRotating`, like Zonk roll-spin) — never snap `facing` without adjusting `rotation`
  alongside. Blades = front = deadly, handle rings = back. The Electron mirrors the same rules on
  its orbit ring: one `attacking` coil-up tick before striking a Murphy in its next ring cell,
  and a dodge reverses `orbitStep` — but its coil-up is deliberately NOT rendered; that blind
  beat is the risk the electron adds (base orbit stays counterclockwise — see gotcha 5).
- **Murphy's death is two-phase** (`MURPHY_DEATH_DELAY_TICKS`): any `events.murphyDied` removes him
  from the grid with a REAL end-of-tick `explodeBomb` blast (`PhysicsEngine`) — the adjacent enemy
  that killed him dies in it too (an Electron killer chain-bursts) — then the world keeps
  simulating while `state.deathDelayTicks` counts down in `resolveCollisions`, and only then does
  the status flip to `dead`/`gameOver`. Lives are decremented when the countdown ends, not when
  the kill lands. Don't "simplify" back to an instant status flip — the explosion playing out
  before the overlay is deliberate UX. A crushing rock is deliberately left mid-air by
  `fallingObjects` (never lands) so this same end-of-tick blast consumes it — every Murphy death
  goes through the one explosion path, killer included.
- **Round Wall cells are *drawn* round where a run ends**: `Renderer.wallCornerMask` rounds a
  Wall corner only when both neighbors on that side are non-solid (off-map counts as solid), so
  the visual matches the roll-off-the-edge mechanic. `WallSquare` stays sharp-cornered on purpose.
- **Two distinct bomb types** (`src/entities/bomb.ts`): impact bombs (type `"bomb"`, drawn as a
  square 3.5" floppy disk) are pushable/fallable but square-shaped so they never roll, and explode
  the instant they collide with anything (land, or get landed on) — otherwise permanently inert.
  Timed bombs (type `"timedBomb"`) carry their own countdown `fuseTicks`, and Murphy's `bombSupply`
  **starts at 0 — it's built up by collecting `bombPickup` occupants** (legend char `"b"`, a
  smaller pulsing red disk) placed in the level; levels don't grant free bombs. Both bomb types
  chain-react off a nearby explosion via `explodeBomb`'s recursive blast-radius scan (which also
  shortens a still-planted under-Murphy fuse).
- **Space is two-speed** (`resolveMurphyLook` in `murphyActions.ts`; `PhysicsEngine.tick` routes
  *every* `spaceHeld` tick there, with or without a direction). Space + direction acts on the
  adjacent cell **instantly** for collection-type actions: a supported Infotron, a bomb pickup, or
  clearing a Base tile. **Planting a timed bomb is a charge-hold instead**: an open-ground target
  increments `murphy.bombCharge` each held tick (rendered as a filling ring around Murphy) and only
  plants after `BOMB_PLANT_CHARGE_TICKS`; releasing Space or changing targets resets the charge.
  Space with **no direction** charges a plant under Murphy's own feet: that variant stores
  `cell.plantedBomb` (fuse burning while he still stands on it, drawn beneath him) and materializes
  into a real `timedBomb` occupant when he steps off — or detonates in place, killing him, if the
  fuse zeroes first.
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
   is done via the PERMANENT debug harness in `src/engine/debugHarness.ts` (`debugFreeze()`,
   `debugLoadLevel()`, `debugTick()`, `debugState()`, `debugDumpGrid()`, `debugMoveMurphy()`,
   `debugSpawnZonk()`), exposed as `window.__game` ONLY when the page is loaded with the `?debug`
   URL flag (`http://localhost:8080/?debug`) — don't re-add ad-hoc copies and don't strip it
   before commits; it ships but is unreachable without the flag.
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
12. **Enemies explode when destroyed, and chains ripple with a visible delay — never instantly.**
    A chain-hit enemy/impact-bomb dies immediately but its own blast fires
    `CHAIN_BLAST_DELAY_TICKS` later via `cell.pendingBlast` + `resolvePendingBlasts` (which
    collects due cells before detonating any, so a marker set by this tick's blast always waits
    its full delay). ONLY an Electron's own blast seeds Infotrons; a Snik-Snak's blast (or any
    other link in the chain) contributes none. Destroying a Bug's Electron specifically is a full
    explosion plus a *deferred* Infotron shower.
    `destroyElectron()` runs a real `explodeBomb` (the triggering faller is consumed and never
    lands; everything destructible in the radius dies; chains apply), but only *records* the
    burst center in `events.electronBursts` — PhysicsEngine spawns the shower at end-of-tick via
    `spawnElectronHarvest`, after ALL of the tick's blasts, because an overlapping bomb blast
    iterating past a just-filled cell would otherwise destroy part of the harvest. Every open
    blast cell (including the Electron's own) gets an Infotron, which falls naturally. A level
    MAY require harvest Infotrons via `LevelData.extraInfotronsRequired` (the Finale sets 7 =
    its worst kill-position yield, an explicit user decision for 12 total). When picking the
    number, count solid cells in the blast at every possible kill position; note a roaming enemy
    wandering into the blast area the same tick can block one more shower cell (an enemy phase
    runs between the blast and the end-of-tick fill) — the Finale accepts that rare edge.
13. **Testing gotcha: `events.anyKey`-driven state transitions (`"dead"` → reload, `"levelComplete"`
    → next level, etc.) are NOT gated by `debugFreeze`.** They live in `Game.loop`'s top-level
    `switch`, outside the `if (!this.debugFrozen)` guard around `updatePlaying`. A stray queued
    keyboard event from earlier in a Playwright session (e.g. a leftover `Enter` press) can silently
    fire one of these transitions on the very next animation frame after a debug-triggered death,
    auto-reloading the level before you can inspect or screenshot the post-death state. If a
    post-death/post-win screenshot looks like a fresh level instead of the expected overlay,
    suspect this before doubting the mechanic — verify via `debugState()` immediately after the
    tick that caused it, not via a screenshot taken any time later.
14. **An enemy's patrol/orbit cells are load-bearing open terrain — a later platform/wall edit can
    silently pave one over.** The Finale's bonus-Zonk platform (`hline` of Wall) overlapped the
    Bug ring's NE cell, so the Electron froze forever at the E cell, politely waiting for a walled
    cell to open (the orbit never skips ahead — see `stepElectron`). When placing *anything* solid
    near a Bug, check all 8 `RING_OFFSETS` cells stay Empty; if an object needs to rest adjacent
    to a ring, put it on a single `WallSquare` pedestal (square = nothing rolls off, and one cell
    can't collide with the ring) rather than a multi-cell platform.
15. **A gravity flip moves *every* eligible object, not just the one your puzzle is about.** The
    Finale's corridor-plug Zonk is designed to float away up a chute when the Gravity Port flips
    gravity — but the Infotron it guarded sat under a round Wall ceiling, so once the plug cell
    opened, the Infotron rolled sideways into it and floated up the chute *after* the Zonk,
    relocating the reward the puzzle was guarding. Ceiling cells above must-stay-put objects in a
    flippable level need `WallSquare` (nothing rolls off it, in either gravity). After any edit
    involving a Gravity Port, re-simulate the flip and diff every Zonk/Infotron position, not just
    the puzzle piece.
16. **Menu keys are gameplay keys — level load must reset movement input.** The start screen's
    Up/Down/Enter presses latch into `InputController`'s `pendingIntent`/`lastHeldDirection` like
    any other keydown, and without `input.resetMovement()` in `Game.loadLevel` the very first tick
    consumed them and "ghost-moved" Murphy a cell with no gameplay input (a real shipped bug). A
    key still physically held across the transition stays inert until re-pressed — that's the
    intended trade.
