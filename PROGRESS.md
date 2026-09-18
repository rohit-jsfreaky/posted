# PROGRESS — POSTED

**Read this first. Update it last.** This is the live state of the build.

---

## Where we are right now

**Phases 0 to 3 are done. Phase 4's art is wired into all five scenes, and Phase 5's
story, sound and ending are written and wired.**

Two gates are open, both because this session had no browser:
1. the test bench has not been run against the art (Phase 4)
2. nobody has played it through or heard the sound (Phase 5)

Both need a browser. Do them in that order before writing another feature.

```
composite(state) -> editor -> align -> diff -> flags -> suspicion -> he replies -> state -> composite(state)
```

What is in the build:
- **Five levels**, each teaching one tool and one tell (`src/lib/levels/`)
- **The antagonist**, `@cal_hampton_77`, who zooms into the exact region he caught,
  posts about it, and reverts one of your changes when the tell is fatal
- **The feed**: your post, replies arriving one at a time and disagreeing with each
  other, counters ticking up on their own
- **Suspicion**, inferred from the shape of the measurements, never from which tool
  you used — the same removal costs 8 done cleanly and 34 done crudely
- **KEEPs**: destroy what proves the photo is real and nobody believes the post
- **Zoom preview**, twice per job, which runs the diff on your current edit through
  the editor's own `getImage()` and tells you what a skeptic would notice
- **An ending** after job five

`npm run dev` → the game on `/`, the diff engine test bench on `/lab`.
`/?job=3` opens any job directly, which is how the levels were tested.

Lint clean, production build passes. **The test bench last ran 21/21 against grey
boxes, and has not been run since the art went in.**

**Still open from Phase 0: the deploy, blocked on a Vercel login Rohit has to do.**

Evidence: `docs/phase0/`, `docs/phase1/`, `docs/phase3/`, `tools/out/preview-*.png`.

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
| 2 antagonist + feed | **done** | **yes — sloppy edit, he catches it, it reverts** |
| 3 levels 2–5 + tool unlocks | **done** | **yes — all five playable, scored, in one sitting** |
| 4 art | **wired in**, placement verified, engine numbers **not re-tested** | not yet — needs a `/lab` run |
| 5 story, sound, ending | written and wired, **unheard and unplayed** | no — needs a playthrough |
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

## What Phase 3 proved (three places the editor contradicted the plan)

Every level was driven by hand in the real editor. The lab (`/lab`) now runs **21 hand-made
edits across all five levels, 21/21**, and prints every number it measured.

| job | run in the real editor | result |
|---|---|---|
| 1 | brightness down, crop the bouncer off | solved, suspicion 30/60, moves to job 2 |
| 2 | crop only | **he posts the dimensions, the car comes back** |
| 2 | crop, then resize to 1200×800 | solved, suspicion 8/55, **he says nothing** |
| 3 | filled shape over the man on the dock | `subject_removed`, suspicion 4/85 |
| 4 | sticker in bay four, shadow drawn under it | solved, plus his non-fatal grain comment |
| 5 | frame + black bar + label, **wrong** case number | caught, `case_numbered` reverted |
| 5 | same, with the seven-digit number off the folder | solved → the ending |

### 1. The Blur slider is global, not local

`LEVELS.md` built Level 3 around blurring only the window. Measured: the slider blurs the whole
photo, so "the window is the only soft thing in the shot" is a tell that can never fire. The
level now runs on what the editor can do — blow the highlight out with global brightness
(cheapest), cover it in a colour that belongs (medium), or paint a crude blob (expensive and he
catches it) — and crop still cannot reach the middle of a frame, which was always the point.

### 2. Filters never touch a pasted object

`LEVELS.md` and `ART.md` built Level 4's third flag on Filter → Noise graining a pasted car
until it matched the plate. Measured: filters apply to the photo layer only. With Noise at 35
the whole car park grained to 0.33 and the pasted car stayed at **0.003**. The counter-move
does not exist in this editor.

The obvious replacement, "make its light match", does not hold up either: brightness cannot be
separated from an object's own colour, and dropping a paste's opacity blends it toward the
asphalt rather than toward the car parked beside it. **So the flag was cut** rather than ship a
requirement resting on a measurement that cannot be justified. Level 4 asks for the two things
that can be measured: something is there, and it throws a shadow. The grain is still measured,
and he still points at it — an observation that costs nothing, which is its own kind of menace.

### 3. A black bar raises local contrast, it does not collapse it

`DESIGN.md` §5 defines `face_hidden` as variance collapsing. That describes blur and pixelate.
A redaction bar is a hard edge against skin, so variance goes **up**. Level 5 now reads a
redaction as detail collapsing *or* a third of the zone being replaced *or* the zone going very
dark — a bar over the eyes is the classic redaction precisely because a third is enough.

### Engine changes this forced

- **The alignment search now proposes candidates and lets the 2-D check decide.** A flat scene —
  a car park, a bare interview room — has almost no variation along one axis, and matching
  profiles that carry no information invents answers. Identity and scaled-to-fit are always on
  the list. Level 5's frame case went from fit 0.287 to 1.000.
- **Alignment ignores the outer 7% of the frame.** That is where frames, vignettes and caption
  bars land. Judging alignment on pixels the player was invited to paint over made a correctly
  aligned photo look unrecognisable.
- **The photometric fit is trimmed.** A big local edit dragged a plain least-squares fit toward
  itself, and then untouched zones looked like they had drifted — a black bar over a face was
  making the label at the other end of the photo read as changed.
- **Grain is a low percentile of high-frequency energy, not its mean.** An object's own edges are
  high frequency too, so a detailed sticker read as grainy when averaged.
- **A flat area that stops being flat counts as something placed there.** Without it, an empty
  parking bay could only be seen to have a car in it if the car was the wrong brightness.
- **Clipping is not tampering.** A zone pinned at white cannot match any prediction, so its
  brightness residual means nothing — but the detail test still catches that nobody can read it.

### Honest gaps

- Level 3's three-flag solve was verified in the lab, not driven end to end in the editor. Jobs
  1, 2, 4 and 5 were each completed by hand in the real editor.
- Flip is still unhandled (four rotations only). A mirrored photo reads as heavily changed.
- Suspicion is scored per post, so splitting a job across several small posts costs less than
  doing it in one. Worth a look in Phase 5.

## Phase 4 — art so far

Nine images generated with ChatGPT image gen and saved to `public/art/`. 16 MB total.

| file | what | size |
|---|---|---|
| `bg-club.png` | art deco club front, empty street, **blank** sign panel, closed door | 1536×1024 |
| `bg-street.png` | pastel street, empty kerb on the right, **blank** street name plate | 1536×1024 |
| `bg-marina.png` | dock, moored boat, **blank** clock, a real glass window, water | 1536×1024 |
| `bg-lot.png` | car park, one parked car **with a shadow**, empty bay, gate booth | 1536×1024 |
| `bg-archive.png` | interview room, empty chair, folder with a **blank** label, blinds | 1536×1024 |
| `cut-bouncer.png` | doorman, arms folded, full body | RGBA |
| `cut-subject.png` | the brother, full body | RGBA |
| `cut-car.png` | side-on saloon car | RGBA |
| `cut-witness.png` | seated person, upper body | RGBA |

Rules the prompts had to enforce, and why:

- **Everything is shot in daylight, including the scenes the game plays at night.** Night is a
  multiply pass over the day render (`DESIGN.md` §4), so the art has to arrive lit.
- **Backgrounds are empty of anything removable.** No bouncer, no car, no people. Those are
  cut-outs the game switches on and off — bake one into a background and it can never be
  removed, which is the entire game.
- **Every sign, plate, clock face and label is blank.** The game draws its own text, and Level 5
  turns on what the label says.
- **Every scene has contrast and structure in both directions** — fences, poles, bay lines, wall
  panels, blinds. Phase 3 proved a flat scene breaks the alignment search.
- **The car park is lit, not black**, for the reason in the Phase 3 notes.
- 1536×1024 is 3:2, matching the 1200×800 scene box exactly, so nothing needs to be squashed.

### Wiring it in

All five scenes now draw the art. The grey boxes are gone, and so are the helpers that drew
them (`person`, `circle`, `glow`, the seeded `grain`).

Zones were **measured, not estimated**. `tools/grid.py` puts a labelled fractional grid over a
background; `tools/preview.py` renders a level and outlines its zones on top. Every zone was
read off the grid and then checked on the preview, which is how the queue was caught standing
inside the bouncer zone — a figure there would have corrupted the one reading Level 1 turns on.

Three things the art forced:

1. **`tools/prep.py`.** Backgrounds became 1200×800 JPEGs and cut-outs were cropped to their
   alpha bounding box. 16 MB became 3.0 MB. The trim matters for more than size: the generator
   returns a figure floating in a transparent square, so untrimmed, a zone and the art in it
   are not the same rectangle — and that equality is what the diff engine stands on.
2. **The art loads before the first frame.** `composite()` is synchronous by design, so
   `src/lib/assets.ts` preloads everything and both pages wait on it. `art()` throws rather
   than returning nothing, because a half-drawn world is one the diff engine would happily
   measure as real.
3. **Level 4 moved to daylight and Level 3 gained a glare pass.** The lot reads as a bright
   afternoon now, which kills the "nothing pasted in can match a black lot" problem for good.
   The marina's window is mid-toned in the art, so the glass gets lit and the ghost is drawn
   faint on top — the cheapest solution needs the window to be the first thing that clips.

### Not verified yet

- **The test bench has not been run against the art.** It needs a browser and the Playwright
  MCP server dropped mid-session. Thresholds were tuned against flat grey boxes; photographic
  art has far more texture, so `detail` and `grain` in particular may need re-tuning. Run
  `/lab` first thing next session — that is the gate, not the build passing.
- Missing cut-outs: a standing witness of its own for Level 2 (it reuses the Level 3 figure),
  and the queue is the same man mirrored.
- The UI chrome from `ART.md` (phone frame, feed card, composer) is still CSS, which is fine.

## Phase 5 — story, sound, ending

### The five chapters

`src/lib/story.ts` holds the arc from `DESIGN.md` sec 6, and it is now actually in the game
rather than implied by the level text.

| job | the client | what he posts after it lands |
|---|---|---|
| 1 | a stranger who wants into a club | something about that photo is bugging him |
| 2 | somebody careful, who wants the thread deleted | "second one this week" |
| 3 | a brother alibi | he puts all three jobs side by side |
| 4 | **no name given** | "thats my car. i was home. i have the router logs" |
| 5 | the same client, finishing it | "ok" |

Job four is the turn. The client who will not give a name wants a car *added* to a scene, and
when the player asks whose, the answer is the man who has spent a week posting about them. Job
five is the file that finishes him. Then the ending says the quiet part: he was right every
single time, about every single one, and nobody checked.

**The brief is a conversation now, not a paragraph.** Messages arrive one at a time in the DM
panel, the player's own replies are in there, and the client writes back once the job lands.
A wall of text at the top of the screen is a wall of text nobody reads.

### Sound

`src/lib/sound.ts` synthesises five cues from oscillators — post, reply, sting, revert, landed.
No audio files, so nothing to download and nothing to license. The audio context is created on
the first play rather than at import, because browsers will not start audio before a click, and
the first cue always follows the click on Save. Everything is wrapped: a browser that refuses
audio costs the player nothing. There is a sound toggle in the header.

### Not verified yet

- **The sound has never been heard.** It was written without a browser this session. The tones
  are quiet and short by construction, but they need one listen before the demo video.
- **Nobody has played it start to finish since the art went in.** That is the actual Phase 5
  finish line — a stranger reaching the ending in 10 to 15 minutes without being told what to
  do — and it needs a human, not a check.
- The DM timing (messages 1.1s apart, payoff at 2.4s, his beat at 6.4s) is guesswork until
  somebody sits through it.

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

### 2026-09-18 — Phases 2 and 3 (the antagonist, and all five jobs)
- `src/lib/level.ts` — what a level is: zones, state, flags, KEEPs, tells, tolerance
- `src/lib/levels/level1..5.ts` — five jobs, each with its own scene, rules and tells
- `src/lib/draw.ts` — grey-box scene helpers, all on fractional coordinates
- `src/lib/suspicion.ts` — infers the method from the shape of the numbers, never the tool
- `src/lib/zones.ts` — zone maths, including the ground band beneath an object
- `src/components/Feed.tsx`, `ZoomView.tsx` — the feed, and the camera push into a tell
- `src/components/Game.tsx` — level progression, staggered replies, ticking counters, the
  revert, the case-number question and the ending
- Diff engine generalised: colour, grain, detail and absolute brightness per zone, plus the
  outer ring for spotting a frame
- Test bench rebuilt to cover all five levels: **21/21**
- Drove every level by hand in the real editor and found three places where the editor does
  not do what the design docs assumed (see above)

## Next action

1. **Rohit runs `npx vercel login`** (one time, interactive). Then the deploy is one command
   and Phase 0's finish line passes.
2. **Run `/lab` against the art.** The wiring is done and placement is verified by eye, but the
   diff thresholds have only ever been tested against grey boxes. Expect to re-tune, then play
   all five jobs in the real editor again. This is the gate on Phase 4.
3. **Play it end to end** and listen to it. Phase 5's content is in; what is missing is one
   human sitting through all five jobs. Watch for: does the first job teach itself, is the DM
   pacing right, and does his turn in job four actually land.
4. **Phase 6** is the README, the demo video (first shot is the bouncer disappearing), the
   deploy and the form.
