# PROGRESS — POSTED

**Read this first. Update it last.** This is the live state of the build.

---

## Where we are right now

**Phase 1 is done. The risk is dead.** The loop works end to end with the real editor:

```
composite(state) -> editor -> save -> align -> diff -> flags -> state -> composite(state)
```

Level 1 is playable and winnable with grey boxes. Crop the bouncer off the edge and drop the
brightness, press Save, and the street comes back as night: neon sign lit, door open, a queue
outside, and the bouncer simply not there. What you posted was a narrow dim crop. What the world
shows is clean and full size. That gap is the whole game and it reads exactly as intended.

**The one thing still open from Phase 0 is the deploy, blocked on a Vercel login Rohit has to
do himself.** Everything else in Phase 0 passed.

Stack: Next.js 16.3.5 + React 19.2.8 + Tailwind 4 + `@unlayer/react-image-editor` 1.0.2.
`npm run dev` → the game on `/`, the diff engine test bench on `/lab`.
Lint clean, production build passes.

Evidence: `docs/phase0/*.png`, `docs/phase1/*.png`.

Last updated: 2026-09-18.

## The clock

| | |
|---|---|
| Deadline | **24 Sep 2026, 23:59 UTC** = 25 Sep, 05:29 IST |
| Days left as of 18 Sep | **6** |
| Target submit | **23 Sep**, one day early |

## Phase status

| phase | status | finish line passed? |
|---|---|---|
| 0 setup | built + proven locally, **deploy blocked on `vercel login`** | not yet — needs the live URL |
| 1 diff → flags → re-render (**THE RISK**) | **done** | **yes — all four checks, real editor** |
| 2 antagonist + feed | next | no |
| 3 levels 2–5 + tool unlocks | not started | no |
| 4 art | not started | no |
| 5 story, sound, ending | not started | no |
| 6 ship | not started | no |

## Open questions

- [ ] **Name.** "POSTED" has not been collision-checked on itch.io or Steam. Do this before the
      README is written. Backups considered: CLEAN PLATE, SOURCE, UNSOURCED.
- [ ] **Judge's asset clarification** — Rohit has it verbally. Get a screenshot saved into this
      folder as `judge-asset-clarification.png`.
- [x] **Does the Unlayer text tool expose the typed string to the host app? No.** Checked the
      shipped types and the live runtime on 17 Sep. The whole public surface is
      `createEditor()` → `{ destroy, getImage, hasChanges, updateOptions, reset }`. Nothing
      reads layers or text. **So `DESIGN.md` §5 option 2 is the plan:** detect `sign_changed`,
      then let the player pick from authored strings. No fragility, still a real choice.

## What Phase 0 proved about the editor (this changes Phase 1)

Measured on the live editor, `cdn.unlayer.com/image-editor/2.7.0`, 17 Sep.

1. **Save returns JPEG, not PNG.** The `dataUrl` comes back as `data:image/jpeg;base64,…` even
   though we fed it a PNG. JPEG compression adds noise across the whole image, so the diff
   thresholds in `DESIGN.md` §5 must survive that. Mean-delta over a rectangle is fine. Any
   check that looks at single pixels is not. The "meaningless edit fires no flag" test in
   Phase 1 is the one that will catch this — run it early.
2. **Crop changes the dimensions.** 1200×800 became 739×800. Scaling the saved image back to
   the original box before diffing is not optional, it is the first step.
3. **The editor applies a pending crop when you press Save.** No separate apply step.
4. **A data URL source avoids CORS entirely.** `onLoadError` never fired. Keep feeding the
   editor canvas output, never a remote URL.
5. **The editor loads from Unlayer's CDN at runtime.** The page needs a network connection.
   There is an `offline` option and a `licenseUrl`; not needed, but worth knowing if the CDN is
   slow on demo day.

## What Phase 1 proved (and the two real bugs it found)

The finish line, all four run against the **real editor**, not simulated:

| check | result |
|---|---|
| crop the bouncer off the edge | saved 739×800, `bouncer_removed` only, he is gone from the re-render |
| drop brightness | gain 0.555, `night` only, bouncer stays on the door |
| both in one edit | both flags, door opens, queue appears, **job solved** |
| rotate 90° | saved 800×1200, rotation detected, **no flags, nothing moves** |
| sticker dropped in an empty corner | **no flags, nothing moves** |

Plus `/lab`, a test bench of 11 hand-made edits that runs the diff engine and prints every
number it measured. Currently **11/11**. Run it after any change to `src/lib/diff.ts`.

### Bug 1 — the brightness slider subtracts light, it does not scale it

This one nearly sank the level. Dropping brightness fired `bouncer_removed` as well as `night`,
which would have let a player win Level 1 with one slider drag.

Cause: the diff modelled the whole-photo change as a single multiplier. The editor's slider
**subtracts** a constant, so a dark object loses a far bigger *share* of its brightness than a
bright one. After dividing by one global gain, every dark zone looked tampered with.

Fix: fit `saved = a × original + b` by least squares over the content both images share. That
covers brightness, contrast and both together. A zone is only suspicious when it drifts from
what that fit predicts. Measured on the real editor:

| slider | brightness left | fires |
|---|---|---|
| −15 | 0.735 | nothing |
| −25 | 0.555 | night |
| −35 | 0.397 | night |
| −45 | 0.238 | night |
| −60 | 0.070 | nothing — the photo is unreadable |

So the player needs roughly −20 or more for night, and overdoing it fails on purpose.

### Bug 2 — flat zones broke the structure test

Correlation is undefined on a patch with no detail, so the door (a plain rectangle) read as
"changed" on every single post. Fixed with explicit rules: if the zone never had detail, only
its brightness can say anything; if it had detail and now has none, it was covered.

### Rules that came out of it

- **A photo crushed to black proves nothing.** Below 0.12 brightness or 0.02 contrast the post
  is marked unreadable and fires no flags at all. Overdoing an edit is now a real failure mode,
  not a cheat.
- **Align before diffing, always.** Crop, resize and rotate all change where things sit. The
  engine searches scale and offset on each axis independently (a crop is axis aligned, so the
  column means of the saved image are a slice of the original's), tries four rotations, and
  verifies the winner in 2-D. It recovered a 1.62× stretch from a crop-then-resize exactly.
- A whole post reads in **5–70 ms**.

### Left for later

- Flip is not handled — only four rotations. A mirrored photo will read as heavily changed.
  Decide in Phase 3 whether a flip should count as a real change (it probably should).
- The `facade` zone contains the `bouncer` zone, so painting over the bouncer moves the facade
  reading a little (0.05 against a 0.10 threshold). Matters only when facade becomes a KEEP in
  Phase 3 — give KEEP zones their own geometry then.

## Decisions already made (do not reopen)

- **`draw` is never a core verb.** It is always the crude, high-suspicion option. The entire
  competitive position is that every other entry uses the editor as a paint brush.
- **The world always re-renders from authored art.** The player's saved pixels are read once for
  flags, then discarded. Do not "optimise" this away — the gap between scrappy edit and polished
  reality is the game's magic moment.
- **No runtime AI.** Zero image generation while the game runs.
- **Max 6 state variables and 6 flags per level.**
- **Zones in fractions, never pixels.**
- **Five levels, 10–15 minutes, a distinct ending.** Not eight chapters. Not endless.

## How this idea was chosen

The first idea (Tinfoil Keys, a GTA VI detective game where you draw on evidence) was dropped
after researching the live field on GitHub: seven entries are GTA-detective themed and two —
`breakwater-run` and `klustor` — already own the draw-a-line mechanic.

Then Rohit found the actual opening, and it is the reason this project exists:

> Drawing is one feature of an image editor, not the image editor. You can draw with a plain
> HTML canvas. Remove the editor from `breakwater-run` or `klustor` and the game still works.
> Both fail Parth's rule 3 — *"could I build this without the sponsor's tech?"*

So the search narrowed to: **a game where the puzzle is which manipulation solves the problem.**
That cannot exist without a real image editor.

Full field research and the kill table are in `CLAUDE.md`.

## Session log

### 2026-09-17 — scaffold
- Researched the live field: 17 entries found across 4 GitHub searches
- Researched game design references: Papers Please, Obra Dinn, Not For Broadcast, Hypnospace
  Outlaw, Orwell, Simulacra, Okami, Viewfinder, Crayon Physics, NEVER HAPPENED
- Confirmed the genre is empty: itch.io has 7 misinformation games (all cast you as the
  debunker), 3 collage+drawing games, 0 forgery games
- Confirmed engagement across the whole challenge is tiny — the top post has 17 likes
- Read the Unlayer editor's full capability surface from the live demo
- Wrote `CLAUDE.md`, `DESIGN.md`, `MASTER-PLAN.md`, `LEVELS.md`, `ART.md`, this file

### 2026-09-17 — Phase 0
- Read the `unlayer/react-image-editor` README live off GitHub, and the shipped `index.d.ts`
- Scaffolded with the official `create-next-app` (TS, Tailwind, App Router, `src/`), moved into
  the repo root so the docs stay at the top level
- Installed `@unlayer/react-image-editor@1.0.2` (peer: react >= 18; we run react 19.2.8)
- `src/lib/scene.ts` — Level 1 as grey boxes, zones in fractions, plus `compositeToDataUrl()`
- `src/components/EditorHarness.tsx` — the editor mounted, save readout on screen and in console
- `src/app/page.tsx` — loads the harness with `ssr: false`, since it composites on a canvas
- Lint clean, `next build` passes
- Drove it in a real browser: crop → Save → 739×800 back, bouncer gone, `dataUrl` in console
- Found the JPEG-on-save and dimension-change behaviour (see the section above)
- Answered the text-tool open question: the API cannot read typed text

### 2026-09-18 — Phase 1 (the risk)
- `src/lib/gray.ts` — greyscale plates at a 300px working width, rotation, bilinear sampling,
  row/column profiles, normalised cross-correlation
- `src/lib/align.ts` — finds where the saved image sits inside the original: exhaustive 1-D
  search over scale and offset per axis, four rotations, verified on a 2-D grid
- `src/lib/diff.ts` — one linear photometric fit for the whole photo, then per-zone structure,
  brightness residual and how much of the zone fell outside the frame
- `src/lib/scene.ts` — rewritten as a real state-driven composite: day/night, bouncer, crowd,
  door, sign. Night is a multiply plus a neon screen pass over the day render, never a second
  painting
- `src/lib/level1.ts` — the job, how flags mutate the world, the win condition
- `src/components/Game.tsx` — the loop, with the street, the state, and every number the diff
  measured shown on screen
- `src/lib/mutations.ts` + `/lab` — 11 hand-made edits run against the engine, all re-encoded as
  JPEG to carry the same compression noise the editor adds
- Found and fixed the subtractive-brightness bug and the flat-zone bug (see above)
- All four finish-line checks pass against the real editor; lab at 11/11; build passes

## Next action

1. **Rohit runs `npx vercel login`** (one time, interactive). Then the deploy is one command
   and Phase 0's finish line passes.
2. **Phase 2 — the antagonist and the feed.** The loop works but there is nobody to beat yet.
   The feed panel, the account that zooms in on the tell, the zoom animation, and his correction
   reverting one flag. Finish line: make a sloppy edit on purpose, he catches it, the change
   reverts, and it feels bad enough to want another go.
