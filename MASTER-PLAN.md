# MASTER-PLAN — POSTED

Seven phases. Each has a **finish line**. A phase is not done until its finish line passes.
No phase starts before the one above it finishes.

**Deadline: 24 Sep 2026, 23:59 UTC.** Target submit: **23 Sep** — one day early.

---

## The clock

| | |
|---|---|
| Today | 17 Sep 2026 |
| Days to deadline | 7 |
| Target submit | **23 Sep** |
| Buffer | 1 day |

---

## Phase 0 — setup (2 hours)

Next.js app, Unlayer editor mounted, deployed to Vercel with a live URL on day one.

```
npx create-next-app@latest
npm install @unlayer/react-image-editor
```

Use the **official init command**. Never hand-write a scaffold. Open the live Unlayer docs with
Playwright before configuring anything — never configure from memory.

**Finish line:** a deployed public URL where the editor loads an image, you can crop it, hit
Save, and the `dataUrl` prints to the console.

---

## Phase 1 — THE RISK: diff → flags → re-render (day 1)

**This is the whole project. If it does not work, nothing else matters.**

Build one level with **grey boxes only**. No art. Grey rectangle = background, darker rectangle
= bouncer, box = sign.

Build, in this order:
1. `composite(state)` → canvas → flat image
2. Hand that image to the editor
3. `onSave` → scale saved image back to the original box
4. `diff()` → the six flag checks from `DESIGN.md` §5
5. Apply flags → new state
6. `composite()` again → the box is gone

**Finish line — all four must pass:**
- [ ] Crop the bouncer box out → save → the bouncer is gone from the re-rendered scene
- [ ] Drop brightness → save → the scene renders in night colours
- [ ] Do both in one edit → both flags fire
- [ ] Do something meaningless (rotate 90°, add a random sticker in an empty corner) → **no
      flag fires**, scene unchanged

That last one matters most. A diff engine that fires on everything is worthless.

> **If this is not fun with grey boxes, stop and change shape. Day 2, not day 6.**

---

## Phase 2 — the antagonist + the feed (day 2)

The game is plain without a person to beat.

- The feed panel: posts, replies, counters that **tick upward**, reaction icons
- The antagonist account: zooms in, finds the tell, posts the correction
- The **zoom animation**: camera pushes into the exact region, circles it
- His correction **reverts one flag** — the bouncer is back
- Comments arrive with **staggered latency**, not all at once
- Opinion is **fractured** — believers, doubters, one unrelated joke

**Finish line:** make a sloppy edit on purpose. He catches it, the zoom plays, the change
reverts, and it feels bad in a way that makes you want to try again.

---

## Phase 3 — levels 2 to 5 + tool unlocks (days 3–4)

Five levels total, from `LEVELS.md`. Each introduces exactly one new tool and one new tell.

```
L1  crop                    tell: the frame line breaks
L2  + resize                tell: dimensions changed
L3  + filter (blur/bright)  tell: only one region is soft
L4  + stickers              tell: no shadow
L5  + text, shapes, frame   tell: wrong font / redaction is itself suspicious
```

Suspicion, zoom preview (2 per job), and per-level KEEPs all live here.

**Finish line:** all five levels playable start to finish with grey art, with the scoring and
the antagonist working, in one sitting, without a crash.

---

## Phase 4 — art (day 5)

Judge confirmed **official GTA VI images and posters are acceptable**. Source material comes
from official promo art. See `ART.md`.

- 5 backgrounds
- ~25 transparent cutouts
- neon / crowd / weather overlays
- UI chrome: the feed, the phone frame, the post composer

**Finish line:** all five levels render with real art and the night composite looks genuinely
like night, not like a blue rectangle over a photo.

---

## Phase 5 — story, sound, ending (day 6)

- The five-chapter arc with the antagonist (`DESIGN.md` §6)
- Client DMs that set up each job
- Sound: post whoosh, notification, the zoom sting, the revert
- **A distinct ending.** Not an endless mode. Closure.

**Finish line:** a stranger plays start to finish in 10–15 minutes and reaches the ending
without being told what to do.

---

## Phase 6 — ship (day 7)

- [ ] README: what it is · the idea · **how React Image Editor is used** · screenshots/GIF ·
      technical notes
- [ ] Live URL working, tested on a phone
- [ ] Star `github.com/unlayer/react-image-editor`
- [ ] Demo video — **first shot is the bouncer disappearing**, no talking over it
- [ ] Submit the Google Form
- [ ] Post with `#BuiltWithImageEditor`, tag Unlayer

**Finish line:** submitted, with a day to spare.

---

## Cut list — in this order, if time runs out

1. Levels 5, then 4 (three good levels beat five rough ones)
2. Sound
3. The client DM fiction (jobs can be stated plainly)
4. Zoom preview

## Never cut

- The diff → re-render loop
- The antagonist
- Any tool being meaningfully used beyond `draw`

Those three are the entire competitive position. Everything else is decoration.
