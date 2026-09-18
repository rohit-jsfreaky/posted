# DESIGN — POSTED

How the game works. Read with `CLAUDE.md` and `LEVELS.md`.

---

## 1. The premise

Leonida runs on a feed. The feed does not check anything. If a picture says it, the street
believes it — and then the street *is* it.

You are nobody with a laptop and an anonymous account. People pay you to make things true.

## 2. The loop, precisely

```
                    +---------------------------+
                    |  WORLD STATE (variables)  |
                    +---------------------------+
                                 |
                     composite() | draws layers
                                 v
                    +---------------------------+
                    |   flat image (canvas)     |
                    +---------------------------+
                                 |
                          player edits in Unlayer
                                 |
                              onSave
                                 v
                    +---------------------------+
                    |  diff(original, saved)    |
                    +---------------------------+
                                 |
                              FLAGS
                                 v
                    +---------------------------+
                    |  apply flags -> new state |
                    +---------------------------+
                                 |
                                 +--> back to composite()
```

**The player's saved pixels are read once, then discarded.** They are a message, not an asset.
The world is always re-rendered from authored layers.

### Why discard the player's image

If we kept it, the player would see their own crooked crop and blotchy paint. Instead they see
a clean, believable street with the bouncer simply not there. That gap — scrappy edit in,
polished reality out — **is the game's magic moment.** Do not "optimise" it away.

## 3. World state

Each level is a small set of variables. Level 1 in full:

```js
{
  time:    'day' | 'night',
  bouncer: true | false,
  sign:    'PRIVATE' | string,
  car:     null | { x: number, y: number },   // relative 0..1
  crowd:   false | true,                      // derived from time
}
```

That is the entire world. **Five variables.** No combinatorial explosion, nothing emergent,
nothing to debug at 3am.

Rule: **a level never exceeds 6 state variables.** If a level needs more, split it.

## 4. Rendering — composite(), not generate()

```js
function composite(state, assets, ctx) {
  ctx.drawImage(assets.bg, 0, 0);

  if (state.time === 'night') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#1a2a5e';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(assets.neon, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(assets.crowd, 0, 0);
  }

  if (state.bouncer) ctx.drawImage(assets.bouncer, ...zone('bouncer'));
  if (state.car)     ctx.drawImage(assets.car, ...at(state.car));

  drawSignText(ctx, state.sign, zone('sign'));
}
```

Ten lines. Runs in under a millisecond. **Zero image generation at runtime, ever.**

Night is a composite operation over the day background, not a second painting. One background
per level, not two.

## 5. The diff engine

All zones are stored as **fractions of width/height**, never pixels, so crop and resize cannot
break them:

```js
const ZONES = {
  bouncer: { x: 0.62, y: 0.40, w: 0.12, h: 0.35 },
  sign:    { x: 0.28, y: 0.18, w: 0.30, h: 0.10 },
  road:    { x: 0.00, y: 0.72, w: 1.00, h: 0.28 },
};
```

Before diffing, the saved image is scaled back to the original canvas box. Then:

| flag | detection | threshold |
|---|---|---|
| `night` | mean brightness of whole image dropped | `after < before * 0.65` |
| `bouncer_removed` | mean abs pixel delta inside the bouncer zone | `> 0.25` of that zone |
| `car_placed` | new high-saturation solid content in the road zone | `> 0.04` of road area |
| `sign_changed` | pixel delta inside the sign zone | `> 0.15` of that zone |
| `face_hidden` | local variance inside a face zone collapsed (blur/pixelate) | variance `< 40%` of before |
| `official` | a frame border appeared — outer 4% ring changed uniformly | `> 0.60` of ring |

Every check is mean-delta or variance over a rectangle. **No OCR, no CV, no model.** Each is
5–10 lines.

### How the player did it does not matter

`bouncer_removed` fires whether they cropped him out, painted over him, covered him with a
sticker, or blurred him into mush. The game reads the **result**, not the method.

That is what makes the puzzle open: several tools reach the same flag, at different suspicion
costs (see §7).

### Text is the one special case

Do **not** OCR the sign. Two acceptable approaches, in order of preference:

1. Detect `sign_changed`, then re-render the sign in the game's own font using the string the
   player typed — captured from the editor's text input.
2. If capturing the input is unreliable, detect `sign_changed` and present three authored
   options ("OPEN", "CLOSED", "FREE ENTRY"). Still a real choice, zero fragility.

Either way the player's crooked text is replaced by a clean authored sign. Consistent with §2.

## 6. The antagonist

Without a person to beat, this is a spreadsheet with a meter. There is one recurring account.

He is the Cal Hampton archetype, published by Rockstar: *"casual paranoia loves company"*, home
alone, private tabs open, trusts nothing.

He zooms in on every post. When he finds the tell, the game plays a **zoom animation** — the
camera pushes into the exact region, circles it, and his post goes viral.

**And his correction reverts one of your changes.** The bouncer is back. Adapt.

```
ch.1   just an annoying reply
ch.2   he digs up your older posts
ch.3   he spots the pattern — "same guy doing all of this"
ch.4   a job comes in: destroy his credibility
ch.5   he was right about everything
```

He is the reason to play. Make him funny and specific, never generic.

## 7. Suspicion

Every change costs. Bigger and cruder changes cost more.

```
crop an edge object          low
brightness / hue shift       low      (if consistent with light direction)
blur a region                medium   (unless the same depth plane is also soft)
sticker placed               medium   (high if it casts no shadow)
paint over with draw         high     (edges never match)
shapes slapped on top        high
```

Win condition per job: hit the required flags **without** pushing suspicion past the threshold.
The skill is lying with the fewest, most plausible moves — not precision, not dexterity.

**This is the lesson from `NEVER HAPPENED` (Steam, 66% "Mixed"):** its premise was loved, but it
made the skill manual colour-matching under a timer and players bounced. Our skill is
*deduction* — "what would give this away?" — never hand-eye accuracy.

## 8. Zoom preview

Before posting, the player can zoom into one region and see what a skeptic would see.
**Two previews per job.** This is the commit-under-uncertainty tension from `Not For Broadcast`'s
two-second broadcast delay.

## 9. Failure is not punishment

If no flag fires, nothing changes and the feed mocks you:

> *"bro what did you even do 😐"*

No random behaviour. No silent failure. Every outcome is legible.

## 10. Design rules, locked

1. **The canvas test** — could plain HTML canvas do this? Then it is not load-bearing.
2. **`draw` is never the best answer.** It is the crude, expensive option.
3. **Max 6 state variables per level.**
4. **Max 6 flags per level.**
5. **Zones in fractions, never pixels.**
6. **No OCR, no CV, no runtime model calls.**
7. **Every job has KEEPs, not just TARGETs** — things that must stay visible, or the post is
   not believable. This is what stops "crop it to one pixel".
8. **The world always re-renders from authored art.** Never display the player's raw edit as
   the new world.

## 11. What this borrows, and from where

| system | source | why |
|---|---|---|
| jobs with rules that grow | Papers, Please | escalating constraint without new systems |
| punishment arrives after you commit | Papers, Please (the fax) | you learn but cannot undo |
| live meter + preview before commit | Not For Broadcast | tension without twitch |
| tools unlock one per chapter | Okami's Celestial Brush | vocabulary grows, game teaches itself |
| a limited resource per edit | Okami's ink | forces economy, creates skill |
| doubters accumulate before you fail | Return of the Obra Dinn (batched validation) | stops brute-force guessing |
| the world visibly reflects what you did | Headliner: NoviNews (the walk home) | consequence you can see, not a number |
| whole thing is a believable fake UI | Simulacra / Hypnospace Outlaw | cheap content, pure web, our stack |
| *what is in the picture becomes real* | Viewfinder | the one-line hook |
| skill must be deduction, not dexterity | NEVER HAPPENED's mixed reviews | the trap to avoid |
